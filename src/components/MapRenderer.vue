<script setup lang="ts">
import type { TerritoryCode } from '@/types/branded'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClipExtentEditor } from '@/composables/useClipExtentEditor'
import { useErrorMessage } from '@/composables/useErrorMessage'
import { useMapRender } from '@/composables/useMapRender'
import { useMapWatchers } from '@/composables/useMapWatchers'
import { useProjectionPanning } from '@/composables/useProjectionPanning'
import { useSelectedTerritory } from '@/composables/useSelectedTerritory'
import { useSliderState } from '@/composables/useSliderState'
import { useTerritoryCursor } from '@/composables/useTerritoryCursor'
import { TRANSITION_DURATION } from '@/config/transitions'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useViewStore } from '@/stores/view'
import { logger } from '@/utils/logger'

const props = withDefaults(defineProps<Props>(), {
  geoData: null,
  preserveScale: false,
  width: 200,
  height: 160,
  mode: 'simple',
  fullHeight: true,
})

const debug = logger.vue.component

interface Props {
  geoData?: GeoJSON.FeatureCollection | null
  area?: number
  preserveScale?: boolean
  width?: number
  height?: number
  projection?: string | null
  territoryCode?: TerritoryCode
  fullHeight?: boolean
  mode?: 'simple' | 'composite'
}

const geoDataStore = useGeoDataStore()
const parameterStore = useParameterStore()
const viewStore = useViewStore()
const mapContainer = ref<HTMLElement>()

const { size, renderSvg, applyOverlays, applyBasemap, dispose: disposeBasemap, basemapResult, basemapLoading } = useMapRender(props)
const { errorMessage } = useErrorMessage()
const { t } = useI18n()

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
  hoveredTerritoryCode,
  getCursorStyle: getTerritoryyCursorStyle,
  handleTerritoryMouseDown,
  handleTerritoryMouseEnter,
  handleTerritoryMouseLeave,
  createBorderZoneOverlays,
  cleanup: cleanupTerritoryCursor,
} = useTerritoryCursor()

const {
  renderClipExtentHandles,
  isDraggingCorner,
  cleanup: cleanupClipExtentEditor,
} = useClipExtentEditor()

const { isSliderActive } = useSliderState()

const { selectedTerritory, selectTerritory } = useSelectedTerritory()

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
    onBasemapChange: redrawBasemap,
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
  disposeBasemap()
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

// The territories stay; a render under way draws the basemap when it ends
function redrawBasemap() {
  const svg = mapContainer.value?.querySelector('svg')
  if (svg && !isRendering.value) {
    applyBasemap(svg)
  }
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

    const svg = await renderSvg()
    if (!svg || !mapContainer.value) {
      return
    }

    // The previous map stays on screen while the next one is built
    mapContainer.value.replaceChildren(svg)
    applyBasemap(svg)

    if (isDragEnabled.value) {
      const customComposite = cartographer.value?.customComposite
      if (props.mode === 'composite' && viewStore.viewMode === 'composite-custom' && customComposite) {
        createBorderZoneOverlays(svg, customComposite, size.value.width, size.value.height)
      }
      else {
        setupTerritoryEventListeners(svg)
      }

      renderClipExtentHandles(svg)
    }

    await applyOverlays(svg)
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Error rendering map'
    console.error('Error rendering map', err)
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

watch(selectedTerritory, () => {
  const svg = mapContainer.value?.querySelector('svg')
  if (svg) {
    renderClipExtentHandles(svg)
  }
})

// Runs in the capture phase: the drag listeners of a territory stop the propagation of mousedown.
function selectTerritoryUnderPointer(event: MouseEvent) {
  const territoryCode = (event.target as Element).getAttribute?.('data-territory') ?? props.territoryCode
  if (territoryCode) {
    selectTerritory(territoryCode)
  }
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
    class="map-renderer relative"
    :style="{ '--map-aspect': `${size.width} / ${size.height}`, '--map-ratio': size.width / size.height }"
    :class="{
      'h-full': props.fullHeight,
      'map-renderer--fill': props.fullHeight,
      'h-fit': !props.fullHeight,
    }"
  >
    <div
      ref="mapContainer"
      class="map-plot w-full bg-base-200 border-base-300"
      :class="{
        'map-ready': !isLoading && !error,
        'map-loading': isLoading || error,
      }"
      :style="{
        display: 'flex',
        cursor: cursorStyle,
      }"
      @mousedown.capture="selectTerritoryUnderPointer"
      @mousedown="handleMouseDown"
    />
    <div class="map-frame">
      <p
        v-if="basemapLoading"
        class="map-note delayed-fade-in bottom-1 left-1 flex items-center gap-1.5 text-base-content/70"
        role="status"
        :aria-label="props.territoryCode ? t('basemap.loading') : undefined"
      >
        <span
          class="loading loading-spinner loading-xs"
          aria-hidden="true"
        />
        <!-- The map of one territory, small and repeated in the split view, shows the spinner alone -->
        <template v-if="!props.territoryCode">
          {{ t('basemap.loading') }}
        </template>
      </p>
      <p
        v-else-if="basemapResult && (!basemapResult.ok || basemapResult.value.missingTiles > 0)"
        class="map-note bottom-1 left-1"
        :class="{ 'text-error': !basemapResult.ok }"
      >
        {{ basemapResult.ok ? t('basemap.missingTiles', { count: basemapResult.value.missingTiles }) : errorMessage(basemapResult.error) }}
      </p>
    </div>
  </div>
</template>

<style lang="css" scoped>
@reference 'tailwindcss';
.map-plot {
  @apply h-full w-full rounded-sm flex-col items-center justify-center;
  padding: var(--plot-padding);
  border-width: var(--plot-border);
  border-style: solid;
  transition: opacity var(--transition-fade) ease;
}

.map-plot > :deep(svg) {
  max-width: 100%;
  height: auto;
}

.map-renderer {
  --plot-padding: --spacing(0.5);
  --plot-border: 1px;
  --plot-inset: calc(var(--plot-padding) + var(--plot-border));
  @apply lg:[--plot-padding:--spacing(2)];
}

.map-frame {
  @apply pointer-events-none absolute;
  inset: var(--plot-inset);
}

/* A filling map is larger than its drawing on one axis, and the drawing is centered in it; below lg, it takes the proportions of its drawing, so that it fills its width */
.map-renderer--fill {
  container-type: size;
  @apply max-lg:h-auto max-lg:[aspect-ratio:var(--map-aspect)];
}

.map-renderer--fill .map-frame {
  inset: 0;
  margin: auto;
  width: min(100cqw - 2 * var(--plot-inset), (100cqh - 2 * var(--plot-inset)) * var(--map-ratio));
  height: min(100cqh - 2 * var(--plot-inset), (100cqw - 2 * var(--plot-inset)) / var(--map-ratio));
}

.map-renderer--fill .map-plot > :deep(svg) {
  width: 100%;
  height: 100%;
  min-height: 0;
}

/* The svg box is larger than its viewBox on one axis: hide what is drawn beyond the viewBox */
.map-renderer--fill .map-plot > :deep(svg > *) {
  clip-path: view-box;
}

.map-loading {
  opacity: 0;
}

.map-ready {
  opacity: 1;
}
</style>
