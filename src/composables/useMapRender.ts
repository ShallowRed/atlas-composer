import type { ViewState } from '@/core/view'
import type { Translation } from '@/types'
import type { TerritoryCode } from '@/types/branded'
import { computed } from 'vue'
import { ViewOrchestrationService } from '@/core/view'
import { Cartographer } from '@/services/rendering/cartographer-service'
import { MapRenderCoordinator } from '@/services/rendering/map-render-coordinator'
import { MapSizeCalculator } from '@/services/rendering/map-size-calculator'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'
import { useUIStore } from '@/stores/ui'
import { useViewStore } from '@/stores/view'
import { logger } from '@/utils/logger'

const debug = logger.vue.composable

interface MapRenderProps {
  mode: 'simple' | 'composite'
  geoData: GeoJSON.FeatureCollection | null
  projection?: string | null
  territoryCode?: TerritoryCode
  area?: number
  width: number
  height: number
  preserveScale: boolean
}

// `props` is the reactive props object of the component, read without destructuring
export function useMapRender(props: MapRenderProps) {
  const atlasStore = useAtlasStore()
  const projectionStore = useProjectionStore()
  const viewStore = useViewStore()
  const geoDataStore = useGeoDataStore()
  const parameterStore = useParameterStore()
  const uiStore = useUIStore()

  const showSphere = computed<boolean>(() => {
    const atlasConfig = atlasStore.currentAtlasConfig
    if (!atlasConfig)
      return false

    const viewState: ViewState = {
      viewMode: viewStore.viewMode,
      atlasConfig,
      showProjectionSelector: viewStore.showProjectionSelector,
      showIndividualProjectionSelectors: viewStore.showIndividualProjectionSelectors,
    }

    return ViewOrchestrationService.shouldShowSphere(viewState)
  })

  const size = computed(() => {
    const config = projectionStore.canvasDimensions
      ? {
          compositeWidth: projectionStore.canvasDimensions.width,
          compositeHeight: projectionStore.canvasDimensions.height,
        }
      : undefined

    return MapSizeCalculator.calculateSize({
      mode: props.mode === 'composite' ? 'composite' : 'territory',
      preserveScale: props.preserveScale,
      area: props.area,
      width: props.width,
      height: props.height,
      config,
    })
  })

  async function renderSvg(): Promise<SVGSVGElement | null> {
    const cartographer = geoDataStore.cartographer
    if (!cartographer) {
      return null
    }

    if (props.mode === 'composite') {
      return renderComposite()
    }

    if (!props.geoData) {
      return null
    }

    const { width, height } = size.value
    const projectionToUse = props.projection ?? projectionStore.selectedProjection

    if (!projectionToUse) {
      debug('Skipping render: projection not yet loaded')
      return null
    }

    if (props.territoryCode) {
      const territoryParams = parameterStore.getEffectiveParameters(props.territoryCode)
      cartographer.updateProjectionParams(territoryParams)
    }

    return MapRenderCoordinator.renderSimpleMap(cartographer, {
      geoData: props.geoData,
      projection: projectionToUse,
      width,
      height,
      area: props.area,
      preserveScale: props.preserveScale,
      showGraticule: uiStore.showGraticule,
      showSphere: showSphere.value,
      showCompositionBorders: uiStore.showCompositionBorders,
      showMapLimits: uiStore.showMapLimits,
    })
  }

  async function renderComposite(): Promise<SVGSVGElement> {
    const cartographer = geoDataStore.cartographer
    if (!cartographer) {
      throw new Error('Cartographer not initialized')
    }

    debug('renderComposite() starting - territories: %o', geoDataStore.filteredTerritories.map(t => t.code))

    const { width, height } = size.value

    const territoryProjections: Record<string, string> = {}
    const territoryTranslations: Record<string, Translation> = {}

    const territoryCodes = cartographer.customComposite
      ? Object.keys(cartographer.customComposite)
      : []

    debug('Building territory params for %d territories', territoryCodes.length)

    for (const territoryCode of territoryCodes) {
      const brandedCode = territoryCode as TerritoryCode
      const projectionId = parameterStore.getTerritoryProjection(brandedCode)
      if (projectionId) {
        territoryProjections[territoryCode] = projectionId
      }
      territoryTranslations[territoryCode] = parameterStore.getTerritoryTranslation(brandedCode)
    }

    if (!projectionStore.selectedProjection) {
      debug('Cannot render composite: selectedProjection not loaded')
      throw new Error('Cannot render composite map: projection not loaded')
    }

    return await MapRenderCoordinator.renderCompositeMap(cartographer, {
      viewMode: viewStore.viewMode as 'composite-custom' | 'built-in-composite' | 'individual',
      territoryMode: viewStore.territoryMode,
      selectedProjection: projectionStore.selectedProjection,
      compositeProjection: projectionStore.compositeProjection ?? undefined,
      width,
      height,
      showGraticule: uiStore.showGraticule,
      showSphere: showSphere.value,
      showCompositionBorders: uiStore.showCompositionBorders,
      showMapLimits: uiStore.showMapLimits,
      currentAtlasConfig: atlasStore.currentAtlasConfig,
      territoryProjections,
      territoryTranslations,
      territories: geoDataStore.filteredTerritories,
    })
  }

  async function addTerritoryAttributes(svg: SVGSVGElement) {
    let geoData: GeoJSON.FeatureCollection | null = null

    if (props.mode === 'composite' && geoDataStore.cartographer) {
      try {
        geoData = await geoDataStore.getFilteredRawData()
      }
      catch (err) {
        debug('Failed to fetch raw unified data: %O', err)
      }
    }
    else if (props.geoData || geoDataStore.rawUnifiedData) {
      geoData = props.geoData || geoDataStore.rawUnifiedData
    }

    if (geoData) {
      Cartographer.addTerritoryAttributes(svg, geoData)
    }
  }

  async function applyOverlays(svg: SVGSVGElement) {
    const { width, height } = size.value
    const overlayProjectionId = projectionStore.compositeProjection || projectionStore.selectedProjection

    let graticuleGeoData: GeoJSON.FeatureCollection | GeoJSON.Feature | { type: 'Sphere' } | undefined
    if (props.mode === 'composite') {
      graticuleGeoData = await geoDataStore.getFilteredRawData() ?? undefined
    }
    else {
      graticuleGeoData = props.geoData ?? undefined
    }

    const graticuleParams = props.territoryCode
      ? parameterStore.getEffectiveParameters(props.territoryCode)
      : parameterStore.globalEffectiveParameters

    const isCompositeMode = props.mode === 'composite'
    const effectiveViewMode = isCompositeMode
      ? viewStore.viewMode as 'composite-custom' | 'built-in-composite'
      : 'simple'

    if (!overlayProjectionId) {
      return
    }

    const cartographer = geoDataStore.cartographer
    const renderProjection = cartographer?.lastProjection ?? undefined
    const filteredTerritoryCodes = new Set(geoDataStore.allActiveTerritories.map(t => t.code))

    MapRenderCoordinator.applyOverlays(
      svg,
      isCompositeMode ? viewStore.viewMode as 'composite-custom' | 'built-in-composite' : 'individual',
      {
        showBorders: uiStore.showCompositionBorders,
        showLimits: uiStore.showMapLimits,
        width,
        height,
        customComposite: isCompositeMode ? cartographer?.customComposite : undefined,
        renderedProjection: renderProjection,
        filteredTerritoryCodes,
      },
    )

    MapRenderCoordinator.applyGraticuleOverlay(svg, {
      showGraticule: uiStore.showGraticule,
      width,
      height,
      projection: renderProjection,
      projectionId: overlayProjectionId,
      viewMode: effectiveViewMode,
      customComposite: isCompositeMode ? (cartographer?.customComposite as any) : undefined,
      geoData: graticuleGeoData,
      projectionParams: graticuleParams,
      showSphere: showSphere.value,
      filteredTerritoryCodes,
    })
  }

  return {
    size,
    renderSvg,
    addTerritoryAttributes,
    applyOverlays,
  }
}
