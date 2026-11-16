import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { GeoProjection } from 'd3-geo'
import type { GeometryCollection, GeometryObject, Topology } from 'topojson-specification'
import type { ExampleDefinition, ExampleMap } from '@/core/examples'
import { geoPath } from 'd3-geo'
import { feature, mesh } from 'topojson-client'
import { presetFrames, projectionLoader } from '@/services/rendering/preset-frames'

// Properties that scripts/prepare-examples.ts writes on each entity
type EntityProperties = Record<string, unknown> & { name?: string, group?: string }

function groupOf(entity: GeometryObject): string | undefined {
  return (entity.properties as EntityProperties | undefined)?.group
}

// The examples draw the composite of a preset through the published loader, as a reuser of the preset does
export function renderExampleMap(config: CompositeProjectionConfig, topology: Topology, example: ExampleDefinition): ExampleMap {
  const { width, height } = config.canvasDimensions
  // The CompositeProjectionLike of the loader lacks members of the d3 GeoProjection type, which geoPath does not call
  const path = geoPath(projectionLoader().load(config, { width, height }) as unknown as GeoProjection)

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
