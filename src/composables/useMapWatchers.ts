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
    async () => {
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
        return [
          configStore.viewMode,
          configStore.compositeProjection,
          configStore.selectedProjection,
          configStore.territoryMode,
          configStore.scalePreservation,
          // NOTE: referenceScale and canvasDimensions have dedicated watchers above
          uiStore.showGraticule,
          uiStore.showSphere,
          uiStore.showCompositionBorders,
          uiStore.showMapLimits,
          parameterStore.territoryParametersVersion, // Watch parameter version for translations, projections, etc.
          geoDataStore.filteredTerritories,
        ]
      }
      return [
        props.geoData,
        props.projection,
        configStore.selectedProjection,
        props.preserveScale,
        uiStore.showGraticule,
        uiStore.showSphere,
        uiStore.showCompositionBorders,
        uiStore.showMapLimits,
        parameterStore.territoryParametersVersion, // Watch for territory projection changes in split mode
        // NOTE: effectiveProjectionParams is NOT watched here because we have a dedicated
        // watcher that calls updateProjectionParams() which updates the existing cartographer
        // Watching it here would trigger a full re-render which is unnecessary
      ]
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
