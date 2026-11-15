import type { GeoStream } from 'd3-geo'
import type { BasemapFrame, Extent } from '@/core/basemap'
import type { CompositionDemoInput, CompositionMark, Earthquake } from '@/core/examples'
import { geoEquirectangular, geoPath } from 'd3-geo'
import { visibleLabels } from '@/core/basemap'
import { interpolate, territoryOf } from '@/core/examples'
import { presetFrames } from '@/services/rendering/example-map'

type Point = [number, number]

const RAW_MARGIN = 16
const MAX_PLACE_RADIUS = 14
const MIN_PLACE_RADIUS = 1
// An earthquake of magnitude 2.5, the least of the feed, gets the smallest radius
const MIN_EARTHQUAKE_RADIUS = 1.5
const EARTHQUAKE_RADIUS_PER_MAGNITUDE = 2.2

interface TerritoryShape {
  code: string
  path: string
}

export interface CompositionDemo {
  width: number
  height: number
  frames: BasemapFrame[]
  framesPath: string
  marks: CompositionMark[]
  // The contours, each vertex between its raw position (0) and its place through the sub-projection of its territory (1)
  territoriesAt: (progress: number) => TerritoryShape[]
}

const inExtent = ([[x0, y0], [x1, y1]]: Extent, [x, y]: Point) => x >= x0 && x <= x1 && y >= y0 && y <= y1

// The demo places the territories through the sub-projections of the published loader, as the composite of the preset draws them
export function renderCompositionDemo({ config, territories, places }: CompositionDemoInput, earthquakes: Earthquake[]): CompositionDemo {
  const { width, height } = config.canvasDimensions
  const frames = presetFrames(config)
  const frameIndex = new Map(frames.map(({ code }, index) => [code, index]))

  const drawn = territories.features.filter(({ properties }) => frameIndex.has(properties.code))
  const raw = geoEquirectangular().fitExtent([[RAW_MARGIN, RAW_MARGIN], [width - RAW_MARGIN, height - RAW_MARGIN]], { type: 'FeatureCollection', features: drawn })

  function markAt(point: Point): Omit<CompositionMark, 'kind' | 'label' | 'radius' | 'value'> & { frame: number, x: number, y: number } | null {
    const territory = territoryOf(config, drawn, point)
    const index = territory === null ? undefined : frameIndex.get(territory)
    if (territory === null || index === undefined) {
      return null
    }
    const { projection, extent } = frames[index]!
    const composite = projection(point)
    const rawPosition = raw(point)
    if (!composite || !rawPosition || !inExtent(extent, composite)) {
      return null
    }
    return { territory, raw: rawPosition, composite, frame: index, x: composite[0], y: composite[1] }
  }

  const isoCodes = new Set(territories.features.map(({ properties }) => properties.iso))
  const placed = places
    .filter(place => isoCodes.has(place[5]))
    .flatMap(([longitude, latitude, population, name]) => {
      const mark = markAt([longitude, latitude])
      return mark ? [{ ...mark, kind: 'place' as const, label: name, value: population }] : []
    })
  const maxPopulation = Math.max(1, ...placed.map(({ value }) => value))
  const candidates = [
    ...placed.map(mark => ({ ...mark, radius: Math.max(MIN_PLACE_RADIUS, Math.sqrt(mark.value / maxPopulation) * MAX_PLACE_RADIUS) })),
    ...earthquakes.flatMap(({ longitude, latitude, magnitude, label }) => {
      const mark = markAt([longitude, latitude])
      return mark ? [{ ...mark, kind: 'earthquake' as const, label, value: magnitude, radius: Math.max(MIN_EARTHQUAKE_RADIUS, (magnitude - 2) * EARTHQUAKE_RADIUS_PER_MAGNITUDE) }] : []
    }),
  ]
  const marks = visibleLabels(candidates, frames).map(({ frame: _frame, x: _x, y: _y, ...mark }) => mark)

  const framesPath = frames.map(({ extent: [[x0, y0], [x1, y1]] }) => `M${x0},${y0}H${x1}V${y1}H${x0}Z`).join('')

  function territoriesAt(progress: number): TerritoryShape[] {
    return drawn.map((feature) => {
      const sub = frames[frameIndex.get(feature.properties.code)!]!.projection
      const stream = (output: GeoStream): GeoStream => ({
        point(longitude, latitude) {
          const from = raw([longitude, latitude])
          const to = sub([longitude, latitude])
          if (from && to) {
            output.point(...interpolate(from, to, progress), 0)
          }
        },
        lineStart: () => output.lineStart(),
        lineEnd: () => output.lineEnd(),
        polygonStart: () => output.polygonStart(),
        polygonEnd: () => output.polygonEnd(),
        sphere: () => output.sphere?.(),
      })
      return { code: feature.properties.code, path: geoPath({ stream })(feature) ?? '' }
    })
  }

  return { width, height, frames, framesPath, marks, territoriesAt }
}
