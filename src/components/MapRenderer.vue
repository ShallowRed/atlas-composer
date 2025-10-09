<script setup lang="ts">
import type * as Plot from '@observablehq/plot'
import type { CompositeRenderOptions, SimpleRenderOptions } from '@/services/cartographer-service'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ProjectionFactory } from '@/core/projections/factory'
import { projectionRegistry } from '@/core/projections/registry'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

interface Props {
  // For simple territory maps
  geoData?: GeoJSON.FeatureCollection | null
  title?: string
  area?: number
  region?: string
  isMainland?: boolean
  preserveScale?: boolean
  width?: number
  height?: number
  projection?: string // Optional projection override for individual mode

  // For composite maps
  mode?: 'simple' | 'composite'
}

const props = withDefaults(defineProps<Props>(), {
  geoData: null,
  isMainland: false,
  preserveScale: false,
  width: 200,
  height: 160,
  mode: 'simple',
})

const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()
const mapContainer = ref<HTMLElement>()

const isLoading = ref(false)
const error = ref<string | null>(null)
const isMounted = ref(false)
const isRendering = ref(false)

// Use cartographer from store
const cartographer = computed(() => geoDataStore.cartographer)

// Render map on mount
onMounted(async () => {
  // Wait for DOM to be ready
  await nextTick()
  isMounted.value = true
  await renderMap()
})

const computedSize = computed(() => {
  // For composite maps, use fixed larger dimensions
  if (props.mode === 'composite') {
    return { width: 800, height: 600 }
  }

  // Si des dimensions sont explicitement fournies, les utiliser
  if (props.width && props.height && !props.preserveScale) {
    return { width: props.width, height: props.height }
  }

  // Pour la France métropolitaine, utiliser des dimensions fixes
  if (props.isMainland) {
    return { width: 500, height: 400 }
  }

  // Pour les territoires avec préservation d'échelle
  if (props.preserveScale && props.area) {
    const franceMetropoleArea = 550000
    const scaleFactor = Math.sqrt(props.area / franceMetropoleArea)

    const baseWidth = 500
    const baseHeight = 400

    const proportionalWidth = Math.max(50, Math.min(300, baseWidth * scaleFactor))
    const proportionalHeight = Math.max(40, Math.min(240, baseHeight * scaleFactor))

    return {
      width: Math.round(proportionalWidth),
      height: Math.round(proportionalHeight),
    }
  }

  // Dimensions par défaut
  return { width: props.width, height: props.height }
})

const insetValue = computed(() => {
  return props.isMainland ? 20 : 5
})

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

function boundsToRect(bounds: [[number, number], [number, number]]): Rect {
  const [[x1, y1], [x2, y2]] = bounds
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  }
}

function unionRect(base: Rect | null, next: Rect | null): Rect | null {
  if (!next) {
    return base
  }
  if (!base) {
    return { ...next }
  }
  const minX = Math.min(base.x, next.x)
  const minY = Math.min(base.y, next.y)
  const maxX = Math.max(base.x + base.width, next.x + next.width)
  const maxY = Math.max(base.y + base.height, next.y + next.height)
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function appendRectOverlay(
  group: SVGGElement,
  rect: Rect,
  className: string,
  dash: string,
  strokeWidth: number,
): SVGRectElement {
  const rectEl = document.createElementNS(group.namespaceURI, 'rect') as SVGRectElement
  rectEl.setAttribute('x', rect.x.toFixed(2))
  rectEl.setAttribute('y', rect.y.toFixed(2))
  rectEl.setAttribute('width', rect.width.toFixed(2))
  rectEl.setAttribute('height', rect.height.toFixed(2))
  rectEl.setAttribute('fill', 'none')
  rectEl.setAttribute('stroke', 'var(--bc)')
  rectEl.setAttribute('stroke-width', strokeWidth.toString())
  rectEl.setAttribute('stroke-dasharray', dash)
  rectEl.setAttribute('stroke-linejoin', 'round')
  rectEl.setAttribute('class', className)
  group.appendChild(rectEl)
  return rectEl
}

function appendPathOverlay(
  group: SVGGElement,
  pathData: string,
  className: string,
): SVGPathElement {
  const pathEl = document.createElementNS(group.namespaceURI, 'path') as SVGPathElement
  pathEl.setAttribute('d', pathData)
  pathEl.setAttribute('fill', 'none')
  pathEl.setAttribute('stroke', 'var(--bc)')
  pathEl.setAttribute('stroke-width', '1.25')
  pathEl.setAttribute('stroke-dasharray', '8 4')
  pathEl.setAttribute('stroke-linejoin', 'round')
  pathEl.setAttribute('class', className)
  group.appendChild(pathEl)
  return pathEl
}

function computeSceneBBox(svg: SVGSVGElement): Rect | null {
  const paths = Array.from(svg.querySelectorAll('path'))
  if (paths.length === 0) {
    return null
  }

  let bounds: Rect | null = null
  for (const path of paths) {
    const bbox = path.getBBox()
    if (!Number.isFinite(bbox.width) || !Number.isFinite(bbox.height) || bbox.width === 0 || bbox.height === 0) {
      continue
    }
    bounds = unionRect(bounds, {
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
    })
  }

  return bounds
}

function createPathRecorder() {
  const commands: string[] = []
  const format = (value: number) => {
    if (!Number.isFinite(value)) {
      return '0'
    }
    return Math.abs(value) < 1e-6 ? '0' : value.toFixed(6).replace(/\.?0+$/, '')
  }

  return {
    moveTo(x: number, y: number) {
      commands.push(`M${format(x)},${format(y)}`)
    },
    lineTo(x: number, y: number) {
      commands.push(`L${format(x)},${format(y)}`)
    },
    rect(x: number, y: number, width: number, height: number) {
      commands.push(
        `M${format(x)},${format(y)}`,
        `L${format(x + width)},${format(y)}`,
        `L${format(x + width)},${format(y + height)}`,
        `L${format(x)},${format(y + height)}`,
        'Z',
      )
    },
    closePath() {
      commands.push('Z')
    },
    beginPath() {
      // No-op for compatibility
    },
    toString() {
      return commands.join('')
    },
  }
}

function createCompositeBorderPath(
  projectionId: string | undefined,
  width: number,
  height: number,
): string | null {
  if (!projectionId) {
    return null
  }

  const definition = projectionRegistry.get(projectionId)
  if (!definition) {
    return null
  }

  const projection = ProjectionFactory.createById(projectionId)
  if (!projection) {
    return null
  }

  const customFit = definition.metadata?.customFit
  if (customFit) {
    const scaleFactor = width / customFit.referenceWidth
    projection.scale(customFit.defaultScale * scaleFactor)
    projection.translate([width / 2, height / 2])
  }
  else if (typeof projection.translate === 'function') {
    projection.translate([width / 2, height / 2])
  }

  const drawBorders = (projection as any)?.drawCompositionBorders
  if (typeof drawBorders !== 'function') {
    return null
  }

  const context = createPathRecorder()
  drawBorders(context)
  const pathString = context.toString()
  return pathString.length > 0 ? pathString : null
}

function applyOverlays(svg: SVGSVGElement) {
  const showBorders = configStore.showCompositionBorders
  const showLimits = configStore.showMapLimits

  if (!showBorders && !showLimits) {
    return
  }

  const { width, height } = computedSize.value
  const fallbackSceneBounds = showLimits ? computeSceneBBox(svg) : null

  const overlayGroup = document.createElementNS(svg.namespaceURI, 'g') as SVGGElement
  overlayGroup.setAttribute('class', 'map-overlays')
  overlayGroup.setAttribute('pointer-events', 'none')
  svg.appendChild(overlayGroup)

  let mapBounds: Rect | null = null

  if (showBorders) {
    if (configStore.viewMode === 'composite-custom') {
      const composite = cartographer.value?.customComposite
      if (composite) {
        composite.build(width, height, true)
        const borders = composite.getCompositionBorders(width, height)
        borders.forEach((border) => {
          const rect = boundsToRect(border.bounds)
          if (rect.width === 0 || rect.height === 0) {
            return
          }
          appendRectOverlay(overlayGroup, rect, 'composition-border', '8 4', 1.25)
          mapBounds = unionRect(mapBounds, rect)
        })
      }
    }
    else if (configStore.viewMode === 'composite-existing') {
      const overlayProjectionId = (configStore.compositeProjection || configStore.selectedProjection) as string
      const pathData = createCompositeBorderPath(
        overlayProjectionId,
        width,
        height,
      )
      if (pathData) {
        const pathEl = appendPathOverlay(overlayGroup, pathData, 'composition-border')
        const bbox = pathEl.getBBox()
        if (Number.isFinite(bbox.width) && Number.isFinite(bbox.height) && bbox.width > 0 && bbox.height > 0) {
          mapBounds = unionRect(mapBounds, {
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height,
          })
        }
      }
    }
  }

  if (showLimits) {
    const bounds = mapBounds || fallbackSceneBounds
    if (bounds && bounds.width > 0 && bounds.height > 0) {
      appendRectOverlay(overlayGroup, bounds, 'map-limits', '4 3', 1.5)
    }
  }

  if (!overlayGroup.childNodes.length) {
    overlayGroup.remove()
  }
}

async function renderMap() {
  // Don't render if not mounted yet
  if (!isMounted.value) {
    return
  }

  // Don't render if already rendering (prevent concurrent renders)
  if (isRendering.value) {
    return
  }

  // Check required dependencies
  if (!mapContainer.value || !cartographer.value) {
    return
  }

  try {
    isRendering.value = true
    isLoading.value = true
    error.value = null
    mapContainer.value.innerHTML = ''

    let plot: Plot.Plot

    // Handle composite mode
    if (props.mode === 'composite') {
      plot = await renderComposite()
    }
    else {
      // Handle simple mode - geoData is required
      if (!props.geoData) {
        // Don't warn during initial load, only if data should be available
        return
      }

      const { width, height } = computedSize.value
      const projectionToUse = (props.projection ?? configStore.selectedProjection) as string

      const options: SimpleRenderOptions = {
        mode: 'simple',
        geoData: props.geoData,
        projection: projectionToUse,
        width,
        height,
        inset: insetValue.value,
        isMainland: props.isMainland,
        area: props.area,
        preserveScale: props.preserveScale,
        showGraticule: configStore.showGraticule,
        showCompositionBorders: configStore.showCompositionBorders,
        showMapLimits: configStore.showMapLimits,
      }

      plot = await cartographer.value.render(options)
    }

    // Check again after async operations in case component unmounted
    if (!mapContainer.value) {
      // Component unmounted during render - this is normal, just return silently
      return
    }

    mapContainer.value.appendChild(plot as any)
    const svg = mapContainer.value.querySelector('svg')
    if (svg instanceof SVGSVGElement) {
      applyOverlays(svg)
    }
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Error rendering map'
    console.error('Error rendering map:', err)
  }
  finally {
    isLoading.value = false
    isRendering.value = false
  }
}

async function renderComposite(): Promise<Plot.Plot> {
  if (!cartographer.value) {
    throw new Error('Cartographer not initialized')
  }

  const { width, height } = computedSize.value

  // Build custom composite settings if in custom mode
  let customSettings
  if (configStore.viewMode === 'composite-custom') {
    // Get territory codes from the current region's composite config
    const compositeConfig = configStore.currentAtlasConfig.compositeProjectionConfig
    const territoryCodes: string[] = []

    if (compositeConfig) {
      // Add primary/member code(s)
      if (compositeConfig.type === 'single-focus') {
        territoryCodes.push(compositeConfig.mainland.code)
      }
      else {
        compositeConfig.mainlands.forEach(m => territoryCodes.push(m.code))
      }
      // Add all secondary territory codes
      compositeConfig.overseasTerritories.forEach(t => territoryCodes.push(t.code))
    }

    // Build territory projections
    const territoryProjections: Record<string, string> = {}
    if (configStore.projectionMode === 'individual') {
      Object.assign(territoryProjections, configStore.territoryProjections)
    }
    else {
      // Uniform mode: all territories use the same projection
      territoryCodes.forEach((code) => {
        territoryProjections[code] = configStore.selectedProjection as string
      })
    }

    customSettings = {
      territoryProjections,
      territoryTranslations: configStore.territoryTranslations,
      territoryScales: configStore.territoryScales,
    }
  }

  // Determine rendering mode
  const mode = configStore.viewMode === 'composite-custom'
    ? 'composite-custom'
    : 'composite-projection'

  // Get territory codes
  // For composite-existing mode, territories may not be loaded, so use undefined (composite projection handles all territories)
  // For composite-custom mode, use filtered territories
  const territoryCodes = configStore.viewMode === 'composite-existing'
    ? undefined
    : geoDataStore.filteredTerritories.map(t => t.code)

  const projectionId = (configStore.compositeProjection || configStore.selectedProjection) as string

  const options: CompositeRenderOptions = {
    mode,
    territoryMode: configStore.territoryMode,
    territoryCodes,
    projection: projectionId,
    width,
    height,
    settings: customSettings,
    showGraticule: configStore.showGraticule,
    showCompositionBorders: configStore.showCompositionBorders,
    showMapLimits: configStore.showMapLimits,
  }

  return await cartographer.value.render(options)
}

// Watch dependencies based on mode
watch(() => {
  if (props.mode === 'composite') {
    return [
      configStore.viewMode,
      configStore.projectionMode,
      configStore.compositeProjection,
      configStore.selectedProjection,
      configStore.territoryMode,
      configStore.scalePreservation,
      configStore.showGraticule,
      configStore.showCompositionBorders,
      configStore.showMapLimits,
      configStore.territoryTranslations,
      configStore.territoryScales,
      configStore.territoryProjections,
      geoDataStore.filteredTerritories, // Watch filtered territories to re-render when selection changes
    ]
  }
  return [
    props.geoData,
    props.projection,
    configStore.selectedProjection,
    props.preserveScale,
    configStore.showGraticule,
    configStore.showCompositionBorders,
    configStore.showMapLimits,
  ]
}, async () => {
  await renderMap()
}, { deep: true, flush: 'post' })
</script>

<template>
  <div class="map-renderer">
    <h4
      v-if="title"
      class="font-medium mb-2 text-sm text-gray-600"
    >
      {{ title }}
      <span v-if="area">({{ area.toLocaleString() }} km²)</span>
    </h4>

    <div
      v-show="!isLoading && !error"
      ref="mapContainer"
      class="map-plot bg-base-200 w-fit rounded-sm border border-base-300"
      :style="{ display: isLoading || error ? 'none' : 'block' }"
    />
  </div>
</template>
