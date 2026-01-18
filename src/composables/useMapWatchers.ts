import { watch } from 'vue'

import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'
import { useUIStore } from '@/stores/ui'
import { useViewStore } from '@/stores/view'
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

export function useMapWatchers(
  props: MapWatcherProps,
  callbacks: MapWatcherCallbacks,
) {
  const geoDataStore = useGeoDataStore()
  const parameterStore = useParameterStore()
  const projectionStore = useProjectionStore()
  const uiStore = useUIStore()
  const viewStore = useViewStore()

  const stopWatchingProjectionParams = watch(
    () => parameterStore.globalEffectiveParameters,
    async (newParams) => {
      debug('Projection params changed, calling onProjectionParamsChange')
      if (geoDataStore.cartographer && newParams) {
        geoDataStore.cartographer.updateProjectionParams(newParams)
        await callbacks.onProjectionParamsChange()
      }
    },
    { deep: true, immediate: true },
  )

  const stopWatchingCanvasDimensions = watch(
    () => projectionStore.canvasDimensions,
    async (newDimensions) => {
      debug('Canvas dimensions changed, calling onCanvasDimensionsChange')
      if (geoDataStore.cartographer) {
        geoDataStore.cartographer.updateCanvasDimensions(newDimensions ?? null)
        await callbacks.onCanvasDimensionsChange()
      }
    },
    { deep: true },
  )

  const stopWatchingReferenceScale = watch(
    () => projectionStore.referenceScale,
    async (newScale) => {
      debug('Reference scale changed, calling onReferenceScaleChange')
      if (geoDataStore.cartographer && newScale !== undefined) {
        geoDataStore.cartographer.updateReferenceScale(newScale)
        await callbacks.onReferenceScaleChange()
      }
    },
  )

  const stopWatchingAutoFitDomain = watch(
    () => projectionStore.autoFitDomain,
    async (enabled) => {
      debug('Auto fit domain changed: %s', enabled)
      if (geoDataStore.cartographer) {
        geoDataStore.cartographer.updateAutoFitDomain(enabled)
        await callbacks.onDependenciesChange()
      }
    },
  )

  const stopWatchingRenderKey = watch(
    () => geoDataStore.renderKey,
    async (newKey, oldKey) => {
      debug('renderKey changed: %s → %s, triggering re-render', oldKey, newKey)
      await callbacks.onDependenciesChange()
    },
  )

  const stopWatchingDependencies = watch(
    () => {
      if (props.mode === 'composite') {
        return {
          viewMode: viewStore.viewMode,
          compositeProjection: projectionStore.compositeProjection,
          selectedProjection: projectionStore.selectedProjection,
          territoryMode: viewStore.territoryMode,
          scalePreservation: projectionStore.scalePreservation,
          showGraticule: uiStore.showGraticule,
          showCompositionBorders: uiStore.showCompositionBorders,
          showMapLimits: uiStore.showMapLimits,
          territoryParametersVersion: parameterStore.territoryParametersVersion,
          allActiveTerritoriesCount: geoDataStore.allActiveTerritories.length,
        }
      }
      return {
        projection: props.projection,
        selectedProjection: projectionStore.selectedProjection,
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

  const cleanup = () => {
    stopWatchingProjectionParams()
    stopWatchingCanvasDimensions()
    stopWatchingReferenceScale()
    stopWatchingAutoFitDomain()
    stopWatchingRenderKey()
    stopWatchingDependencies()
  }

  return {
    cleanup,
  }
}
