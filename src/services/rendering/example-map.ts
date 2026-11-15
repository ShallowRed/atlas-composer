import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { GeoProjection } from 'd3-geo'
import type { GeometryCollection, GeometryObject, Topology } from 'topojson-specification'
import type { BasemapFrame, Extent } from '@/core/basemap'
import type { ExampleDefinition, ExampleMap } from '@/core/examples'
import { ProjectionLoader } from '@atlas-composer/projection-loader'
import { d3ProjectionFactories } from '@atlas-composer/projection-loader/helpers'
import { geoPath } from 'd3-geo'
import { feature, mesh } from 'topojson-client'

// Properties that scripts/prepare-examples.ts writes on each entity
type EntityProperties = Record<string, unknown> & { name?: string, group?: string }

function groupOf(entity: GeometryObject): string | undefined {
  return (entity.properties as EntityProperties | undefined)?.group
}

function presetLoader(): ProjectionLoader {
  const loader = new ProjectionLoader()
  loader.registerAll(d3ProjectionFactories)
  return loader
}

// The sub-projections of a preset through the published loader, each with the rectangle of the canvas that it draws
export function presetFrames(config: CompositeProjectionConfig): BasemapFrame[] {
  const { width, height } = config.canvasDimensions
  const subProjections = presetLoader().createSubProjections(config, { scale: config.referenceScale, translate: [width / 2, height / 2] })
  // The sub-projections of the loader are d3 projections, whose ProjectionLike type lacks members that invert and geoPath do not call
  return [...subProjections].map(([code, projection]) => ({
    code,
    projection: projection as unknown as GeoProjection,
    extent: (projection.clipExtent?.() ?? [[0, 0], [width, height]]) as Extent,
  }))
}

// The examples draw the composite of a preset through the published loader, as a reuser of the preset does
export function renderExampleMap(config: CompositeProjectionConfig, topology: Topology, example: ExampleDefinition): ExampleMap {
  const { width, height } = config.canvasDimensions
  // The CompositeProjectionLike of the loader lacks members of the d3 GeoProjection type, which geoPath does not call
  const path = geoPath(presetLoader().load(config, { width, height }) as unknown as GeoProjection)

  const entities = topology.objects.entities as GeometryCollection<EntityProperties>
  const features = feature(topology, entities).features.flatMap((entity) => {
    const d = path(entity)
    const value = entity.properties?.[example.valueProperty]
    return d ? [{ path: d, name: String(entity.properties?.name ?? ''), value: typeof value === 'number' ? value : null }] : []
  })

  // A mesh draws each border shared by two entities once
  const border = (filter: (a: GeometryObject, b: GeometryObject) => boolean) => path(mesh(topology, entities, filter)) ?? ''
  const borders = {
    inner: border((a, b) => a !== b && groupOf(a) === groupOf(b)),
    group: border((a, b) => groupOf(a) !== groupOf(b)),
    outline: border((a, b) => a === b),
  }

  const frames = presetFrames(config).map(({ code, extent: [[x0, y0], [x1, y1]] }) => ({ code, x: x0, y: y0, width: x1 - x0, height: y1 - y0 }))

  return { width, height, features, borders, frames }
}
