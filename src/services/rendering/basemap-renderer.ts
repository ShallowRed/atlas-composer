import type { BasemapFrame, BasemapSource, BasemapSourceDefinition, Extent, VectorPalette } from '@/core/basemap'
import type { BasemapError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import { VectorTile } from '@mapbox/vector-tile'
import { geoPath } from 'd3-geo'
import Pbf from 'pbf'
import { BASEMAP_SOURCE_DEFINITIONS, coverFrame, invertOnGlobe, tileOf, visibleLabels, zoomForFrame } from '@/core/basemap'
import { err, ok } from '@/core/types/result'
import { JsonFileLoader } from '@/services/data/json-file-loader'

export interface BasemapRenderOptions {
  width: number
  height: number
  pixelRatio: number
  // Pixel ratio from which the zoom of the tiles is computed: the first, coarser pass reads the tiles of the final one
  zoomPixelRatio?: number
  palette: VectorPalette
  // Language of the names of places, with the Latin name as fallback
  locale: string
  signal: AbortSignal
}

export interface BasemapImage {
  image: Blob
  missingTiles: number
}

type VectorFeature = GeoJSON.Feature<GeoJSON.Geometry, Record<string, unknown>>
type VectorLayers = Record<string, VectorFeature[]>

const VECTOR_LAYERS = ['water', 'landcover', 'landuse', 'waterway', 'transportation', 'boundary', 'place'] as const
const RASTER_CACHE_BYTES = 48 * 1024 * 1024
const VECTOR_CACHE_TILES = 256
// Time after which a render goes back to the event loop
const TIME_BUDGET_MS = 8

class Interrupted extends Error {}

// Least recently used entries leave first once the total weight exceeds the limit
class TileCache<V> {
  private entries = new Map<string, { value: V, weight: number }>()
  private total = 0
  private readonly limit: number

  constructor(limit: number) {
    this.limit = limit
  }

  get(key: string): V | undefined {
    const entry = this.entries.get(key)
    if (entry) {
      this.entries.delete(key)
      this.entries.set(key, entry)
    }
    return entry?.value
  }

  set(key: string, value: V, weight: number): void {
    this.delete(key)
    this.entries.set(key, { value, weight })
    this.total += weight
    for (const [oldest, entry] of this.entries) {
      if (this.total <= this.limit || oldest === key) {
        break
      }
      this.entries.delete(oldest)
      this.total -= entry.weight
    }
  }

  weigh(key: string, weight: number): void {
    const entry = this.entries.get(key)
    if (entry) {
      this.set(key, entry.value, weight)
    }
  }

  delete(key: string): void {
    const entry = this.entries.get(key)
    if (entry) {
      this.entries.delete(key)
      this.total -= entry.weight
    }
  }

  get size(): number {
    return this.entries.size
  }

  get weight(): number {
    return this.total
  }
}

// Shared by every map: a request follows no map's signal, so the interruption of one map leaves the others their tiles
const rasterTiles = new TileCache<Promise<Blob | null>>(RASTER_CACHE_BYTES)
const vectorTiles = new TileCache<Promise<VectorLayers | null>>(VECTOR_CACHE_TILES)
const tileJsonTemplates = new Map<string, Promise<string | null>>()

function tileUrl(template: string, zoom: number, x: number, y: number): string {
  return template.replace('{z}', String(zoom)).replace('{x}', String(x)).replace('{y}', String(y))
}

// A tile that the network or the service refuses, or whose body does not read, leaves its area empty
async function fetchBody<T>(url: string, read: (response: Response) => Promise<T>): Promise<T | null> {
  try {
    const response = await fetch(url)
    return response.ok ? await read(response) : null
  }
  catch {
    return null
  }
}

function rasterTile(url: string): Promise<Blob | null> {
  const cached = rasterTiles.get(url)
  if (cached) {
    return cached
  }
  const promise = fetchBody(url, response => response.blob()).then((blob) => {
    if (blob) {
      rasterTiles.weigh(url, blob.size)
    }
    else {
      rasterTiles.delete(url)
    }
    return blob
  })
  rasterTiles.set(url, promise, 0)
  return promise
}

function vectorTile(url: string, x: number, y: number, zoom: number): Promise<VectorLayers | null> {
  const cached = vectorTiles.get(url)
  if (cached) {
    return cached
  }
  const promise = fetchBody(url, response => response.arrayBuffer()).then((buffer) => {
    const layers = buffer ? decodeVectorTile(buffer, x, y, zoom) : null
    if (!layers) {
      vectorTiles.delete(url)
    }
    return layers
  })
  vectorTiles.set(url, promise, 1)
  return promise
}

function decodeVectorTile(buffer: ArrayBuffer, x: number, y: number, zoom: number): VectorLayers | null {
  try {
    const tile = new VectorTile(new Pbf(new Uint8Array(buffer)))
    const layers: VectorLayers = {}
    for (const name of VECTOR_LAYERS) {
      const layer = tile.layers[name]
      if (layer) {
        layers[name] = Array.from({ length: layer.length }, (_, i) => layer.feature(i).toGeoJSON(x, y, zoom) as VectorFeature)
      }
    }
    return layers
  }
  catch {
    // A body that is not a vector tile counts as a missing tile
    return null
  }
}

function tileJsonTemplate(url: string): Promise<string | null> {
  let template = tileJsonTemplates.get(url)
  if (!template) {
    template = JsonFileLoader.loadUrl<{ tiles?: string[] }>(url)
      .then(result => (result.ok ? result.value.tiles?.[0] ?? null : null))
      .then((value) => {
        if (!value) {
          tileJsonTemplates.delete(url)
        }
        return value
      })
    tileJsonTemplates.set(url, template)
  }
  return template
}

function budget(signal: AbortSignal) {
  let last = performance.now()
  return async () => {
    if (performance.now() - last > TIME_BUDGET_MS) {
      await new Promise(resolve => setTimeout(resolve))
      last = performance.now()
    }
    if (signal.aborted) {
      throw new Interrupted()
    }
  }
}

async function cover(frame: BasemapFrame, zoom: number, yieldIfLate: () => Promise<void>): Promise<Array<[number, number]>> {
  const coverage = coverFrame(frame.projection, frame.extent, zoom)
  let step = coverage.next()
  while (!step.done) {
    await yieldIfLate()
    step = coverage.next()
  }
  return step.value
}

function clampExtent([[x0, y0], [x1, y1]]: Extent, width: number, height: number): Extent {
  return [[Math.max(0, x0), Math.max(0, y0)], [Math.min(width, x1), Math.min(height, y1)]]
}

async function decode(blob: Blob, tileSize: number): Promise<Uint8ClampedArray | null> {
  try {
    const bitmap = await createImageBitmap(blob)
    const canvas = new OffscreenCanvas(tileSize, tileSize)
    const context = canvas.getContext('2d')!
    context.drawImage(bitmap, 0, 0, tileSize, tileSize)
    bitmap.close()
    return context.getImageData(0, 0, tileSize, tileSize).data
  }
  catch {
    // An image that the browser cannot decode counts as a missing tile
    return null
  }
}

async function drawRaster(source: Extract<BasemapSourceDefinition, { kind: 'raster' }>, frames: BasemapFrame[], options: BasemapRenderOptions, canvas: OffscreenCanvas, yieldIfLate: () => Promise<void>) {
  const { width, height, pixelRatio, zoomPixelRatio = pixelRatio } = options
  const context = canvas.getContext('2d')!
  const output = context.createImageData(canvas.width, canvas.height)
  let requested = 0
  let missing = 0
  for (const frame of frames) {
    const { projection, extent } = frame
    const zoom = zoomForFrame(projection, extent, zoomPixelRatio, source.tileSize, source.maxZoom)
    const n = 2 ** zoom
    const tiles = new Map<string, Uint8ClampedArray | null>()
    await Promise.all((await cover(frame, zoom, yieldIfLate)).map(async ([x, y]) => {
      const blob = await rasterTile(tileUrl(source.tiles, zoom, ((x % n) + n) % n, y))
      tiles.set(`${x},${y}`, blob ? await decode(blob, source.tileSize) : null)
    }))
    await yieldIfLate()
    requested += tiles.size
    missing += [...tiles.values()].filter(data => data === null).length
    const [[x0, y0], [x1, y1]] = clampExtent(extent, width, height)
    for (let py = Math.floor(y0 * pixelRatio); py < Math.ceil(y1 * pixelRatio); py++) {
      for (let px = Math.floor(x0 * pixelRatio); px < Math.ceil(x1 * pixelRatio); px++) {
        const inverse = invertOnGlobe(projection, [(px + 0.5) / pixelRatio, (py + 0.5) / pixelRatio])
        if (!inverse) {
          continue
        }
        const [fx, fy] = tileOf(inverse, zoom)
        const data = tiles.get(`${Math.floor(fx)},${Math.floor(fy)}`)
        if (!data) {
          continue
        }
        const sx = Math.min(source.tileSize - 1, Math.floor((fx % 1) * source.tileSize))
        const sy = Math.min(source.tileSize - 1, Math.floor((fy % 1) * source.tileSize))
        const s = (sy * source.tileSize + sx) * 4
        const o = (py * canvas.width + px) * 4
        output.data[o] = data[s]!
        output.data[o + 1] = data[s + 1]!
        output.data[o + 2] = data[s + 2]!
        output.data[o + 3] = 255
      }
      await yieldIfLate()
    }
  }
  context.putImageData(output, 0, 0)
  return { requested, missing }
}

async function drawVector(source: Extract<BasemapSourceDefinition, { kind: 'vector' }>, template: string, frames: BasemapFrame[], options: BasemapRenderOptions, canvas: OffscreenCanvas, yieldIfLate: () => Promise<void>) {
  const { width, height, pixelRatio, zoomPixelRatio = pixelRatio, palette, locale } = options
  const context = canvas.getContext('2d')!
  context.scale(pixelRatio, pixelRatio)
  const labels: Array<{ frame: number, x: number, y: number, name: string, city: boolean }> = []
  let requested = 0
  let missing = 0
  for (const [index, frame] of frames.entries()) {
    const { projection, extent } = frame
    // One zoom finer than the scale of the frame: roads and towns of OpenMapTiles show from there
    const zoom = Math.min(source.maxZoom, zoomForFrame(projection, extent, zoomPixelRatio, source.tileSize, source.maxZoom) + 1)
    const n = 2 ** zoom
    const tiles = await Promise.all((await cover(frame, zoom, yieldIfLate)).map(([x, y]) => vectorTile(tileUrl(template, zoom, ((x % n) + n) % n, y), ((x % n) + n) % n, y, zoom)))
    requested += tiles.length
    missing += tiles.filter(tile => tile === null).length
    const all = (name: typeof VECTOR_LAYERS[number]) => tiles.flatMap(tile => tile?.[name] ?? [])
    const path = geoPath(projection, context)
    const [[x0, y0], [x1, y1]] = clampExtent(extent, width, height)
    const fill = async (features: VectorFeature[], color: string) => {
      context.beginPath()
      features.forEach(feature => path(feature))
      context.fillStyle = color
      context.fill()
      await yieldIfLate()
    }
    const stroke = async (features: VectorFeature[], color: string, lineWidth: number, dash: number[] = []) => {
      context.beginPath()
      features.forEach(feature => path(feature))
      context.strokeStyle = color
      context.lineWidth = lineWidth
      context.setLineDash(dash)
      context.stroke()
      context.setLineDash([])
      await yieldIfLate()
    }
    const ofClass = (name: typeof VECTOR_LAYERS[number], ...classes: string[]) => all(name).filter(feature => classes.includes(String(feature.properties.class)))
    context.save()
    context.beginPath()
    context.rect(x0, y0, x1 - x0, y1 - y0)
    context.clip()
    context.fillStyle = palette.land
    context.fillRect(x0, y0, x1 - x0, y1 - y0)
    await fill(ofClass('landcover', 'wood', 'forest'), palette.wood)
    await fill(ofClass('landcover', 'grass', 'farmland'), palette.grass)
    await fill(ofClass('landcover', 'ice'), palette.ice)
    await fill(ofClass('landuse', 'residential'), palette.residential)
    await fill(all('water'), palette.water)
    await stroke(ofClass('waterway', 'river'), palette.water, 0.7)
    await stroke(ofClass('transportation', 'primary', 'trunk'), palette.majorRoad, 0.7)
    await stroke(ofClass('transportation', 'motorway'), palette.motorway, 1)
    await stroke(all('boundary').filter(feature => feature.properties.admin_level === 4 && !feature.properties.maritime), palette.region, 0.5, [3, 2])
    await stroke(all('boundary').filter(feature => feature.properties.admin_level === 2 && !feature.properties.maritime), palette.country, 1)
    context.restore()
    for (const feature of ofClass('place', 'city', 'town')) {
      const point = feature.geometry.type === 'Point' ? projection(feature.geometry.coordinates as [number, number]) : null
      const name = String(feature.properties[`name:${locale}`] ?? feature.properties['name:latin'] ?? feature.properties.name ?? '')
      if (point && name && point[0] >= x0 && point[0] <= x1 && point[1] >= y0 && point[1] <= y1) {
        labels.push({ frame: index, x: point[0], y: point[1], name, city: feature.properties.class === 'city' })
      }
    }
  }
  drawLabels(context, labels, frames, palette)
  return { requested, missing }
}

function drawLabels(context: OffscreenCanvasRenderingContext2D, labels: Array<{ frame: number, x: number, y: number, name: string, city: boolean }>, frames: BasemapFrame[], palette: VectorPalette) {
  context.textBaseline = 'middle'
  for (const { x, y, name, city } of visibleLabels(labels, frames)) {
    context.beginPath()
    context.arc(x, y, city ? 1.8 : 1.3, 0, 2 * Math.PI)
    context.fillStyle = palette.label
    context.fill()
    context.font = `${city ? 600 : 400} ${city ? 8.5 : 7.5}px system-ui, sans-serif`
    context.lineWidth = 2.5
    context.strokeStyle = palette.labelHalo
    context.strokeText(name, x + 4, y)
    context.fillStyle = palette.label
    context.fillText(name, x + 4, y)
  }
}

// Draws the basemap of a source through the projection of each frame, in their order; an interrupted render returns null
export async function renderBasemap(frames: BasemapFrame[], basemap: BasemapSource, options: BasemapRenderOptions): Promise<Result<BasemapImage, BasemapError> | null> {
  const canvas = new OffscreenCanvas(Math.round(options.width * options.pixelRatio), Math.round(options.height * options.pixelRatio))
  const yieldIfLate = budget(options.signal)
  try {
    let counts = { requested: 0, missing: 0 }
    if (basemap !== 'none') {
      const source = BASEMAP_SOURCE_DEFINITIONS[basemap]
      if (source.kind === 'raster') {
        counts = await drawRaster(source, frames, options, canvas, yieldIfLate)
      }
      else {
        const template = await tileJsonTemplate(source.tileJson)
        if (!template) {
          return err({ code: 'BASEMAP_SOURCE_UNREACHABLE', url: source.tileJson })
        }
        counts = await drawVector(source, template, frames, options, canvas, yieldIfLate)
      }
      await yieldIfLate()
      if (counts.requested > 0 && counts.missing === counts.requested) {
        return err({ code: 'BASEMAP_TILES_FAILED', missingTiles: counts.missing })
      }
    }
    return ok({ image: await canvas.convertToBlob({ type: 'image/png' }), missingTiles: counts.missing })
  }
  catch (error) {
    if (error instanceof Interrupted) {
      return null
    }
    throw error
  }
}
