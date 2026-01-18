<script setup lang="ts">
import type { ViewState } from '@/services/view/view-orchestration-service'
import type { TerritoryCode } from '@/types/branded'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useClipExtentEditor } from '@/composables/useClipExtentEditor'
import { useMapWatchers } from '@/composables/useMapWatchers'
import { useProjectionPanning } from '@/composables/useProjectionPanning'
import { useSliderState } from '@/composables/useSliderState'
import { useTerritoryCursor } from '@/composables/useTerritoryCursor'
import { TRANSITION_DURATION } from '@/config/transitions'
import { getAtlasPresets } from '@/core/atlases/registry'
import { Cartographer } from '@/services/rendering/cartographer-service'
import { MapRenderCoordinator } from '@/services/rendering/map-render-coordinator'
import { MapSizeCalculator } from '@/services/rendering/map-size-calculator'
import { ViewOrchestrationService } from '@/services/view/view-orchestration-service'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'
import { useUIStore } from '@/stores/ui'
import { useViewStore } from '@/stores/view'
import { logger } from '@/utils/logger'

const props = withDefaults(defineProps<Props>(), {
  geoData: null,
  preserveScale: false,
  width: 200,
  height: 160,
  hLevel: 3,
  mode: 'simple',
  fullHeight: true,
})

const debug = logger.vue.component

interface Props {
  geoData?: GeoJSON.FeatureCollection | null
  title?: string
  area?: number
  region?: string
  preserveScale?: boolean
  width?: number
  hLevel?: number
  height?: number
  projection?: string | null
  territoryCode?: TerritoryCode
  fullHeight?: boolean
  mode?: 'simple' | 'composite'
}

const atlasStore = useAtlasStore()
const projectionStore = useProjectionStore()
const viewStore = useViewStore()
const geoDataStore = useGeoDataStore()
const parameterStore = useParameterStore()
const uiStore = useUIStore()
const mapContainer = ref<HTMLElement>()

const showSphere = computed<boolean>(() => {
  const atlasConfig = atlasStore.currentAtlasConfig
  if (!atlasConfig)
    return false

  const atlasId = atlasStore.selectedAtlasId
  const presets = getAtlasPresets(atlasId)
  const hasPresets = presets.length > 0

  const viewState: ViewState = {
    viewMode: viewStore.viewMode,
    atlasConfig,
    hasPresets,
    hasTerritories: geoDataStore.allActiveTerritories.length > 0,
    isPresetLoading: false,
    showProjectionSelector: viewStore.showProjectionSelector,
    showIndividualProjectionSelectors: viewStore.showIndividualProjectionSelectors,
  }

  return ViewOrchestrationService.shouldShowSphere(viewState)
})

watch(
  () => props.territoryCode ? parameterStore.getEffectiveParameters(props.territoryCode) : null,
  () => {
    if (props.territoryCode) {
      debouncedRenderMap()
    }
  },
  { deep: true },
)

const isLoading = ref(true)
const error = ref<string | null>(null)
const isMounted = ref(false)
const isRendering = ref(false)
const pendingRender = ref(false)
let renderDebounceTimer: ReturnType<typeof setTimeout> | null = null

const cartographer = computed(() => geoDataStore.cartographer)

const {
  handleMouseDown: handlePanMouseDown,
  isPanning,
  cursorStyle: panningCursorStyle,
  cleanup: cleanupProjectionPanning,
} = useProjectionPanning(props.projection)

const {
  isDragEnabled,
  isDragging: _isDragging,
  dragTerritoryCode: _dragTerritoryCode,
  hoveredTerritoryCode,
  isTerritoryDraggable: _isTerritoryDraggable,
  getCursorStyle: getTerritoryyCursorStyle,
  handleTerritoryMouseDown,
  handleTerritoryMouseEnter,
  handleTerritoryMouseLeave,
  createBorderZoneOverlays,
  cleanup: cleanupTerritoryCursor,
} = useTerritoryCursor()

const {
  renderClipExtentHandles,
  toggleTerritorySelection,
  isDraggingCorner,
  cleanup: cleanupClipExtentEditor,
} = useClipExtentEditor()

const { isSliderActive } = useSliderState()

const isInDragOperation = computed(() => _isDragging.value || isPanning.value || isDraggingCorner.value || isSliderActive.value)

const cursorStyle = computed(() => {
  if (isDragEnabled.value && hoveredTerritoryCode.value) {
    return getTerritoryyCursorStyle(hoveredTerritoryCode.value)
  }

  return panningCursorStyle.value
})

const { cleanup: cleanupMapWatchers } = useMapWatchers(
  {
    mode: props.mode,
    geoData: props.geoData,
    projection: props.projection,
    preserveScale: props.preserveScale,
  },
  {
    onProjectionParamsChange: debouncedRenderMap,
    onCanvasDimensionsChange: debouncedRenderMap,
    onReferenceScaleChange: debouncedRenderMap,
    onDependenciesChange: debouncedRenderMap,
  },
)

watch(() => props.geoData, (newData, oldData) => {
  if (props.mode === 'simple' && newData !== oldData) {
    debouncedRenderMap()
  }
}, { deep: false })

onMounted(async () => {
  await nextTick()
  isMounted.value = true

  setTimeout(async () => {
    await renderMap()
  }, TRANSITION_DURATION.renderDelay)
})

onUnmounted(() => {
  if (renderDebounceTimer) {
    clearTimeout(renderDebounceTimer)
  }

  if (mapContainer.value) {
    mapContainer.value.innerHTML = ''
  }

  cleanupProjectionPanning()
  cleanupTerritoryCursor()
  cleanupClipExtentEditor()
  cleanupMapWatchers()
})

const computedSize = computed(() => {
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

async function debouncedRenderMap() {
  if (geoDataStore.isReinitializing) {
    pendingRender.value = true
    return
  }

  if (renderDebounceTimer) {
    clearTimeout(renderDebounceTimer)
  }

  if (isRendering.value) {
    pendingRender.value = true
    return
  }

  if (isInDragOperation.value) {
    renderMap()
    return
  }

  renderDebounceTimer = setTimeout(() => {
    renderMap()
  }, 50)
}

async function renderMap() {
  if (!isMounted.value) {
    debug('Skipping render - not mounted yet')
    return
  }

  if (geoDataStore.isReinitializing) {
    debug('Skipping render - geoDataStore reinitializing')
    pendingRender.value = true
    return
  }

  if (isRendering.value) {
    debug('Skipping render - already rendering, will retry after')
    pendingRender.value = true
    return
  }

  if (!mapContainer.value || !cartographer.value) {
    debug('Skipping render - missing dependencies (container: %s, cartographer: %s)', !!mapContainer.value, !!cartographer.value)
    return
  }

  try {
    isRendering.value = true
    isLoading.value = true
    error.value = null

    mapContainer.value.innerHTML = ''

    let svg: SVGSVGElement

    if (props.mode === 'composite') {
      svg = await renderComposite()
    }
    else {
      if (!props.geoData) {
        return
      }

      const { width, height } = computedSize.value
      const projectionToUse = props.projection ?? projectionStore.selectedProjection

      if (!projectionToUse) {
        debug('Skipping render: projection not yet loaded')
        return
      }

      if (props.territoryCode) {
        const territoryParams = parameterStore.getEffectiveParameters(props.territoryCode)
        cartographer.value.updateProjectionParams(territoryParams)
      }

      svg = await MapRenderCoordinator.renderSimpleMap(cartographer.value, {
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

    if (!mapContainer.value) {
      return
    }

    mapContainer.value.appendChild(svg)

    if (svg instanceof SVGSVGElement) {
      if (isDragEnabled.value) {
        let geoData: GeoJSON.FeatureCollection | null = null

        if (props.mode === 'composite' && cartographer.value?.geoData) {
          try {
            const territoryMode = viewStore.territoryMode
            const territoryCodes = geoDataStore.filteredTerritories?.map(t => t.code)
            geoData = await cartographer.value.geoData.getRawUnifiedData(territoryMode, territoryCodes)
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

        if (props.mode === 'composite' && viewStore.viewMode === 'composite-custom' && cartographer.value?.customComposite) {
          createBorderZoneOverlays(
            svg,
            cartographer.value.customComposite,
            computedSize.value.width,
            computedSize.value.height,
            (territoryCode) => {
              toggleTerritorySelection(territoryCode)
              renderClipExtentHandles(svg)
            },
          )
        }
        else {
          setupTerritoryEventListeners(svg)
        }

        renderClipExtentHandles(svg)
      }

      const { width, height } = computedSize.value
      const overlayProjectionId = projectionStore.compositeProjection || projectionStore.selectedProjection

      let graticuleGeoData: GeoJSON.FeatureCollection | GeoJSON.Feature | { type: 'Sphere' } | undefined
      if (props.mode === 'composite') {
        if (cartographer.value?.geoData) {
          const territoryMode = viewStore.territoryMode
          const territoryCodes = geoDataStore.filteredTerritories?.map(t => t.code)
          graticuleGeoData = await cartographer.value.geoData.getRawUnifiedData(territoryMode, territoryCodes) ?? undefined
        }
      }
      else {
        graticuleGeoData = props.geoData ?? undefined
      }

      const graticuleParams = props.territoryCode
        ? parameterStore.getEffectiveParameters(props.territoryCode)
        : parameterStore.globalParameters

      const isCompositeMode = props.mode === 'composite'
      const effectiveViewMode = isCompositeMode
        ? viewStore.viewMode as 'composite-custom' | 'built-in-composite'
        : 'simple'

      if (overlayProjectionId) {
        MapRenderCoordinator.applyOverlays(
          svg,
          isCompositeMode ? viewStore.viewMode as 'composite-custom' | 'built-in-composite' : 'individual',
          {
            showBorders: uiStore.showCompositionBorders,
            showLimits: uiStore.showMapLimits,
            projectionId: overlayProjectionId,
            width,
            height,
            customComposite: isCompositeMode ? cartographer.value?.customComposite : undefined,
            filteredTerritoryCodes: new Set(geoDataStore.allActiveTerritories.map(t => t.code)),
          },
        )

        const renderProjection = cartographer.value?.lastProjection ?? undefined
        MapRenderCoordinator.applyGraticuleOverlay(svg, {
          showGraticule: uiStore.showGraticule,
          width,
          height,
          projection: renderProjection,
          projectionId: overlayProjectionId,
          viewMode: effectiveViewMode,
          customComposite: isCompositeMode ? (cartographer.value?.customComposite as any) : undefined,
          geoData: graticuleGeoData,
          projectionParams: graticuleParams,
          showSphere: showSphere.value,
          filteredTerritoryCodes: new Set(geoDataStore.allActiveTerritories.map(t => t.code)),
        })
      }
    }
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Error rendering map'
    debug('Error rendering map: %O', err)
  }
  finally {
    isLoading.value = false
    isRendering.value = false

    if (pendingRender.value) {
      debug('Pending render detected, scheduling another render')
      pendingRender.value = false
      nextTick(() => {
        debouncedRenderMap()
      })
    }
  }
}

async function renderComposite(): Promise<SVGSVGElement> {
  if (!cartographer.value) {
    throw new Error('Cartographer not initialized')
  }

  debug('renderComposite() starting - territories: %o', geoDataStore.filteredTerritories.map(t => t.code))

  const { width, height } = computedSize.value

  const territoryProjections: Record<string, string> = {}
  const territoryTranslations: Record<string, { x: number, y: number }> = {}

  const territoryCodes = cartographer.value.customComposite
    ? Object.keys(cartographer.value.customComposite)
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

  return await MapRenderCoordinator.renderCompositeMap(cartographer.value, {
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

function setupTerritoryEventListeners(svg: SVGSVGElement) {
  if (!isDragEnabled.value)
    return

  const paths = svg.querySelectorAll('path[data-territory]')

  paths.forEach((path) => {
    path.addEventListener('mousedown', event => handleTerritoryMouseDown(event as MouseEvent))
    path.addEventListener('mouseenter', event => handleTerritoryMouseEnter(event as MouseEvent))
    path.addEventListener('mouseleave', () => handleTerritoryMouseLeave())
  })
}

function handleMouseDown(event: MouseEvent) {
  const target = event.target as Element

  if (isDragEnabled.value && target.hasAttribute && target.hasAttribute('data-territory')) {
    handleTerritoryMouseDown(event)
    return
  }

  handlePanMouseDown(event)
}
</script>

<template>
  <div
    class="map-renderer"
    :class="{
      'h-full': props.fullHeight,
      'h-fit': !props.fullHeight,
    }"
  >
    <div
      ref="mapContainer"
      class="map-plot w-full bg-base-200 border-base-300 p-2"
      :class="{
        'map-ready': !isLoading && !error,
        'map-loading': isLoading || error,
      }"
      :style="{
        display: 'flex',
        cursor: cursorStyle,
      }"
      @mousedown="handleMouseDown"
    />
  </div>
</template>

<style lang="css" scoped>
@reference 'tailwindcss';
.map-plot {
  @apply h-full w-full rounded-sm border flex-col items-center justify-center;
  transition: opacity var(--transition-fade) ease;
}

.map-loading {
  opacity: 0;
}

.map-ready {
  opacity: 1;
}
</style>
