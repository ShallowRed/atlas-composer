import { watch } from 'vue'
import { useI18n } from 'vue-i18n'

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
  onBasemapChange: () => void
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
  const { locale } = useI18n()

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
    async () => {
      debug('Canvas dimensions changed, calling onCanvasDimensionsChange')
      if (geoDataStore.cartographer) {
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
          fillTerritories: uiStore.fillTerritories,
          territoryParametersVersion: parameterStore.territoryParametersVersion,
          allActiveTerritoriesCount: geoDataStore.allActiveTerritories.length,
          activeTerritoryCodes: viewStore.activeTerritoryCodes,
          locale: locale.value,
        }
      }
      return {
        projection: props.projection,
        selectedProjection: projectionStore.selectedProjection,
        preserveScale: props.preserveScale,
        showGraticule: uiStore.showGraticule,
        showCompositionBorders: uiStore.showCompositionBorders,
        showMapLimits: uiStore.showMapLimits,
        fillTerritories: uiStore.fillTerritories,
        territoryParametersVersion: parameterStore.territoryParametersVersion,
        locale: locale.value,
      }
    },
    async () => {
      await callbacks.onDependenciesChange()
    },
    { deep: true, flush: 'post' },
  )

  // Another basemap, or the palette of another theme, redraws the basemap only; when the territories gain or lose their fill, the render above draws the map again
  const stopWatchingBasemap = watch(
    () => [uiStore.basemap, uiStore.theme, uiStore.fillTerritories] as const,
    ([, , fill], [, , previousFill]) => {
      if (fill === previousFill) {
        callbacks.onBasemapChange()
      }
    },
    { flush: 'post' },
  )

  const cleanup = () => {
    stopWatchingProjectionParams()
    stopWatchingCanvasDimensions()
    stopWatchingReferenceScale()
    stopWatchingAutoFitDomain()
    stopWatchingRenderKey()
    stopWatchingDependencies()
    stopWatchingBasemap()
  }

  return {
    cleanup,
  }
}
