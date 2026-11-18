import type { BasemapSource, VectorPalette } from '@/core/basemap'
import type { ProjectionFrame } from '@/core/frames'
import type { BasemapError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { ViewState } from '@/core/view'
import type { BasemapImage } from '@/services/rendering/basemap-renderer'
import type { TerritoryCode } from '@/types/branded'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTerritoryNames } from '@/composables/useTerritoryNames'
import { BASEMAP_SOURCE_DEFINITIONS, basemapFingerprint, CACHED_PIXEL_RATIOS, VECTOR_PALETTES } from '@/core/basemap'
import { provisionalPlacements } from '@/core/frames'
import { ok } from '@/core/types/result'
import { ViewOrchestrationService } from '@/core/view'
import { cachedBasemap, renderBasemap } from '@/services/rendering/basemap-renderer'
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

// Delay between the last render of a map and the render of its basemap
const BASEMAP_DELAY = 200
const MAX_CACHED_PIXEL_RATIO = Math.max(...CACHED_PIXEL_RATIOS)

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
  const { territoryName } = useTerritoryNames()
  const { locale } = useI18n()
  // The frames of the last render of this map, for its basemap
  let frames: ProjectionFrame[] = []

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
      return renderComposite(cartographer)
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

    const rendered = await MapRenderCoordinator.renderSimpleMap(cartographer, {
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
      titleOf: territoryName,
      fillTerritories: uiStore.fillTerritories,
    })
    frames = rendered.frames
    return rendered.svg
  }

  async function renderComposite(cartographer: NonNullable<typeof geoDataStore.cartographer>): Promise<SVGSVGElement> {
    debug('renderComposite() starting - territories: %o', geoDataStore.filteredTerritories.map(t => t.code))

    const { width, height } = size.value

    if (!projectionStore.selectedProjection) {
      debug('Cannot render composite: selectedProjection not loaded')
      throw new Error('Cannot render composite map: projection not loaded')
    }

    const rendered = await MapRenderCoordinator.renderCompositeMap(cartographer, {
      viewMode: viewStore.viewMode,
      territoryMode: viewStore.territoryMode,
      selectedProjection: projectionStore.selectedProjection,
      compositeProjection: projectionStore.compositeProjection ?? undefined,
      width,
      height,
      showGraticule: uiStore.showGraticule,
      showSphere: showSphere.value,
      showCompositionBorders: uiStore.showCompositionBorders,
      showMapLimits: uiStore.showMapLimits,
      territories: geoDataStore.filteredTerritories,
      titleOf: territoryName,
      fillTerritories: uiStore.fillTerritories,
    })
    frames = rendered.frames
    return rendered.svg
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
    const overlayViewMode = isCompositeMode ? viewStore.viewMode : undefined

    if (!overlayProjectionId) {
      return
    }

    const cartographer = geoDataStore.cartographer
    const renderProjection = cartographer?.lastProjection ?? undefined

    MapRenderCoordinator.applyOverlays(
      svg,
      overlayViewMode,
      {
        showBorders: uiStore.showCompositionBorders,
        showLimits: uiStore.showMapLimits,
        width,
        height,
        customComposite: isCompositeMode ? cartographer?.customComposite : undefined,
        renderedProjection: renderProjection,
      },
    )

    MapRenderCoordinator.applyGraticuleOverlay(svg, {
      showGraticule: uiStore.showGraticule,
      width,
      height,
      projection: renderProjection,
      projectionId: overlayProjectionId,
      viewMode: overlayViewMode,
      customComposite: isCompositeMode ? (cartographer?.customComposite as any) : undefined,
      geoData: graticuleGeoData,
      projectionParams: graticuleParams,
      showSphere: showSphere.value,
    })
  }

  let basemapController: AbortController | null = null
  let basemapTimer: ReturnType<typeof setTimeout> | null = null
  const basemapResult = shallowRef<Result<BasemapImage, BasemapError> | null>(null)
  // True from the scheduling of a basemap until its last pass or its cancellation
  const basemapLoading = shallowRef(false)

  // daisyUI sets the color-scheme of each theme
  function basemapPalette(): VectorPalette {
    return getComputedStyle(document.documentElement).colorScheme.includes('dark') ? VECTOR_PALETTES.dark : VECTOR_PALETTES.light
  }

  function cancelBasemap() {
    if (basemapTimer) {
      clearTimeout(basemapTimer)
      basemapTimer = null
    }
    basemapController?.abort()
    basemapController = null
    basemapLoading.value = false
  }

  // The image of the basemap on the map, with what produced it: two images of the same key differ by their projections only; a complete image of a raster basemap keeps its fingerprint
  let shown: { url: string, key: string, fingerprint: string | null, frames: ProjectionFrame[], view: number[] } | null = null

  function replaceShown(next: typeof shown) {
    if (shown) {
      URL.revokeObjectURL(shown.url)
    }
    shown = next
  }

  function basemapKey(basemap: Exclude<BasemapSource, 'none'>, palette: VectorPalette): string {
    return BASEMAP_SOURCE_DEFINITIONS[basemap].kind === 'raster' ? basemap : `${basemap} ${palette.land} ${locale.value}`
  }

  // Draws the basemap 200 ms after the last render of the map, at the resolution of the screen; until then, the previous image stays on the frames that only moved or scaled.
  // A raster basemap whose image the deployment rendered shows that image instead, at once on the first render
  function applyBasemap(svg: SVGSVGElement) {
    cancelBasemap()
    const basemap = uiStore.basemap
    if (basemap === 'none') {
      basemapResult.value = null
      MapRenderCoordinator.removeBasemap(svg)
      replaceShown(null)
      return
    }
    const renderedFrames = frames
    const { x, y, width: viewWidth, height: viewHeight } = svg.viewBox.baseVal
    const view = [x, y, viewWidth, viewHeight]
    const palette = basemapPalette()
    const key = basemapKey(basemap, palette)
    const { width, height } = size.value
    const pixelRatio = window.devicePixelRatio || 1
    // An image of the next whole ratio, scaled by the image element, serves a screen at 1.5
    const cachedRatio = Math.min(MAX_CACHED_PIXEL_RATIO, Math.ceil(pixelRatio))
    const fingerprint = BASEMAP_SOURCE_DEFINITIONS[basemap].kind === 'raster'
      ? basemapFingerprint(basemap, renderedFrames, { width, height, pixelRatio: cachedRatio })
      : null
    // A new theme, the graticule or the borders draw the map again without changing its basemap
    if (fingerprint && shown?.fingerprint === fingerprint) {
      MapRenderCoordinator.insertBasemap(svg, shown.url, { fingerprint })
      return
    }
    const controller = new AbortController()
    basemapController = controller
    basemapLoading.value = true
    const placements = shown?.key === key ? provisionalPlacements(shown.frames, renderedFrames) : []
    if (shown && placements.length > 0) {
      MapRenderCoordinator.insertBasemap(svg, shown.url, { placements, view: shown.view })
    }
    const scheduledAt = Date.now()
    const show = (image: Blob, complete: boolean) => {
      const url = URL.createObjectURL(image)
      MapRenderCoordinator.insertBasemap(svg, url, complete && fingerprint ? { fingerprint } : {})
      replaceShown({ url, key, fingerprint: complete ? fingerprint : null, frames: renderedFrames, view })
    }

    const draw = async () => {
      basemapTimer = null
      try {
        if (fingerprint) {
          const cached = await cachedBasemap(fingerprint, controller.signal)
          if (controller.signal.aborted) {
            return
          }
          if (cached) {
            basemapResult.value = ok({ image: cached, missingTiles: 0 })
            show(cached, true)
            return
          }
        }
        // The render starts 200 ms after the render of the map, as when no image is cached
        const remaining = BASEMAP_DELAY - (Date.now() - scheduledAt)
        if (remaining > 0) {
          await new Promise<void>(resolve => basemapTimer = setTimeout(resolve, remaining))
          basemapTimer = null
          if (controller.signal.aborted) {
            return
          }
        }
        const options = { width, height, palette, locale: locale.value, signal: controller.signal, zoomPixelRatio: pixelRatio }
        // Without a provisional image, a raster basemap draws a coarse first pass, then the pass at the resolution of the screen; a coarse pass would blur the provisional image of every frame, and a vector basemap costs the same at any resolution
        const passes = BASEMAP_SOURCE_DEFINITIONS[basemap].kind === 'raster' && placements.length === 0 ? [0.5, pixelRatio] : [pixelRatio]
        for (const passRatio of passes) {
          const result = await renderBasemap(renderedFrames, basemap, { ...options, pixelRatio: passRatio })
          if (!result || controller.signal.aborted) {
            return
          }
          basemapResult.value = result
          if (!result.ok) {
            MapRenderCoordinator.removeBasemap(svg)
            replaceShown(null)
            return
          }
          show(result.value.image, passRatio === pixelRatio && pixelRatio === cachedRatio && result.value.missingTiles === 0)
        }
      }
      finally {
        if (basemapController === controller) {
          basemapLoading.value = false
        }
      }
    }

    if (fingerprint && !shown) {
      void draw()
    }
    else {
      basemapTimer = setTimeout(draw, BASEMAP_DELAY)
    }
  }

  function dispose() {
    cancelBasemap()
    replaceShown(null)
  }

  return {
    size,
    renderSvg,
    applyOverlays,
    applyBasemap,
    dispose,
    basemapResult,
    basemapLoading,
  }
}
