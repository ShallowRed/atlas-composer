import { watch } from 'vue'

import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useUIStore } from '@/stores/ui'
import { logger } from '@/utils/logger'

const debug = logger.vue.composable

interface MapWatcherProps {
  mode: 'simple' | 'composite'
  geoData?: GeoJSON.FeatureCollection | null
  projection?: string | null
  preserveScale?: boolean
}

interface MapWatcherCallbacks {
  onProjectionParamsChange: () => Promise<void>
  onCanvasDimensionsChange: () => Promise<void>
  onReferenceScaleChange: () => Promise<void>
  onDependenciesChange: () => Promise<void>
}

/**
 * Composable that manages all watchers for MapRenderer component.
 *
 * Consolidates watch statements into a single composable:
 * - effectiveProjectionParams: Updates cartographer projection parameters
 * - canvasDimensions: Updates cartographer canvas dimensions
 * - referenceScale: Updates cartographer reference scale
 * - mode-dependent dependencies: Composite or simple mode dependencies
 */
export function useMapWatchers(
  props: MapWatcherProps,
  callbacks: MapWatcherCallbacks,
) {
  const configStore = useConfigStore()
  const geoDataStore = useGeoDataStore()
  const parameterStore = useParameterStore()
  const uiStore = useUIStore()

  /**
   * Watch for projection parameter changes and update cartographer
   */
  const stopWatchingProjectionParams = watch(
    () => parameterStore.globalEffectiveParameters,
    async (newParams) => {
      debug('Projection params changed, calling onProjectionParamsChange')
      if (geoDataStore.cartographer && newParams) {
        geoDataStore.cartographer.updateProjectionParams(newParams)
        await callbacks.onProjectionParamsChange()
      }
    },
    { deep: true },
  )

  /**
   * Watch for canvas dimensions changes
   */
  const stopWatchingCanvasDimensions = watch(
    () => configStore.canvasDimensions,
    async (newDimensions) => {
      debug('Canvas dimensions changed, calling onCanvasDimensionsChange')
      if (geoDataStore.cartographer) {
        geoDataStore.cartographer.updateCanvasDimensions(newDimensions ?? null)
        await callbacks.onCanvasDimensionsChange()
      }
    },
    { deep: true },
  )

  /**
   * Watch for reference scale changes
   */
  const stopWatchingReferenceScale = watch(
    () => configStore.referenceScale,
    async (newScale) => {
      debug('Reference scale changed, calling onReferenceScaleChange')
      if (geoDataStore.cartographer && newScale !== undefined) {
        geoDataStore.cartographer.updateReferenceScale(newScale)
        await callbacks.onReferenceScaleChange()
      }
    },
  )

  /**
   * Watch for explicit render triggers (from preset switching, etc.)
   */
  const stopWatchingRenderKey = watch(
    () => geoDataStore.renderKey,
    async (newKey, oldKey) => {
      debug('renderKey changed: %s → %s, triggering re-render', oldKey, newKey)
      // Force re-render when renderKey changes
      await callbacks.onDependenciesChange()
    },
  )

  /**
   * Watch mode-dependent dependencies (composite or simple mode)
   */
  const stopWatchingDependencies = watch(
    () => {
      if (props.mode === 'composite') {
        return {
          viewMode: configStore.viewMode,
          compositeProjection: configStore.compositeProjection,
          selectedProjection: configStore.selectedProjection,
          territoryMode: configStore.territoryMode,
          scalePreservation: configStore.scalePreservation,
          showGraticule: uiStore.showGraticule,
          showCompositionBorders: uiStore.showCompositionBorders,
          showMapLimits: uiStore.showMapLimits,
          territoryParametersVersion: parameterStore.territoryParametersVersion,
          allActiveTerritoriesCount: geoDataStore.allActiveTerritories.length,
        }
      }
      // For simple mode, watch these dependencies
      return {
        projection: props.projection,
        selectedProjection: configStore.selectedProjection,
        preserveScale: props.preserveScale,
        showGraticule: uiStore.showGraticule,
        showCompositionBorders: uiStore.showCompositionBorders,
        showMapLimits: uiStore.showMapLimits,
        territoryParametersVersion: parameterStore.territoryParametersVersion,
      }
    },
    async () => {
      await callbacks.onDependenciesChange()
    },
    { deep: true, flush: 'post' },
  )

  /**
   * Cleanup function to stop all watchers
   */
  const cleanup = () => {
    stopWatchingProjectionParams()
    stopWatchingCanvasDimensions()
    stopWatchingReferenceScale()
    stopWatchingRenderKey()
    stopWatchingDependencies()
  }

  return {
    cleanup,
  }
}
