import type { ProjectionLike } from '@atlas-composer/projection-loader'
import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { GeoProjection } from 'd3-geo'
import type { GeometryCollection, GeometryObject, Topology } from 'topojson-specification'
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

// The examples draw the composite of a preset through the published loader, as a reuser of the preset does
export function renderExampleMap(config: CompositeProjectionConfig, topology: Topology, example: ExampleDefinition): ExampleMap {
  const { width, height } = config.canvasDimensions
  const loader = new ProjectionLoader()
  loader.registerAll(d3ProjectionFactories)
  // The CompositeProjectionLike of the loader lacks members of the d3 GeoProjection type, which geoPath does not call
  const path = geoPath(loader.load(config, { width, height }) as unknown as GeoProjection)

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

  const subProjections = loader.createSubProjections(config, { scale: config.referenceScale, translate: [width / 2, height / 2] })
  const frames = [...subProjections].flatMap(([code, projection]: [string, ProjectionLike]) => {
    const extent = projection.clipExtent?.() as [[number, number], [number, number]] | null | undefined
    return extent ? [{ code, x: extent[0][0], y: extent[0][1], width: extent[1][0] - extent[0][0], height: extent[1][1] - extent[0][1] }] : []
  })

  return { width, height, features, borders, frames }
}
