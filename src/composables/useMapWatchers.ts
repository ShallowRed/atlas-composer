import { watch } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useUIStore } from '@/stores/ui'

interface MapWatcherProps {
  mode: 'simple' | 'composite'
  geoData?: GeoJSON.FeatureCollection | null
  projection?: string
  preserveScale?: boolean
}

interface MapWatcherCallbacks {
  onProjectionParamsChange: () => Promise<void>
  onFittingModeChange: () => Promise<void>
  onCanvasDimensionsChange: () => Promise<void>
  onReferenceScaleChange: () => Promise<void>
  onDependenciesChange: () => Promise<void>
}

/**
 * Composable that manages all watchers for MapRenderer component.
 *
 * Consolidates 6 watch statements into a single composable:
 * - effectiveProjectionParams: Updates cartographer projection parameters
 * - projectionFittingMode: Updates cartographer fitting mode
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
      console.info('[useMapWatchers] Projection params changed, calling onProjectionParamsChange')
      if (geoDataStore.cartographer && newParams) {
        geoDataStore.cartographer.updateProjectionParams(newParams)
        await callbacks.onProjectionParamsChange()
      }
    },
    { deep: true },
  )

  /**
   * Watch for fitting mode changes
   */
  const stopWatchingFittingMode = watch(
    () => configStore.projectionFittingMode,
    async (newMode) => {
      console.info('[useMapWatchers] Fitting mode changed, calling onFittingModeChange')
      if (geoDataStore.cartographer) {
        geoDataStore.cartographer.updateFittingMode(newMode)
        await callbacks.onFittingModeChange()
      }
    },
  )

  /**
   * Watch for canvas dimensions changes
   */
  const stopWatchingCanvasDimensions = watch(
    () => configStore.canvasDimensions,
    async (newDimensions) => {
      console.info('[useMapWatchers] Canvas dimensions changed, calling onCanvasDimensionsChange')
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
      console.info('[useMapWatchers] Reference scale changed, calling onReferenceScaleChange')
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
      console.info(`[useMapWatchers] renderKey changed: ${oldKey} → ${newKey}, triggering re-render`)
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
          showSphere: uiStore.showSphere,
          showCompositionBorders: uiStore.showCompositionBorders,
          showMapLimits: uiStore.showMapLimits,
          territoryParametersVersion: parameterStore.territoryParametersVersion,
          filteredTerritoriesCount: geoDataStore.filteredTerritories.length,
        }
      }
      // For simple mode, watch these dependencies
      return {
        projection: props.projection,
        selectedProjection: configStore.selectedProjection,
        preserveScale: props.preserveScale,
        showGraticule: uiStore.showGraticule,
        showSphere: uiStore.showSphere,
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
    stopWatchingFittingMode()
    stopWatchingCanvasDimensions()
    stopWatchingReferenceScale()
    stopWatchingRenderKey()
    stopWatchingDependencies()
  }

  return {
    cleanup,
  }
}
