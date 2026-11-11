// Reference produced on commit afe1525, except the usa/composite-custom key, produced on the commit
// "fix(registry): declare every preset of configs/presets once", and the territories of the france/split key that
// the split preset omits, produced on the commit "fix(view): write the preset values of each territory in the split
// view", and the spain keys, produced on the commit "feat(atlases): add the spain atlas"; regenerate a key only on the
// commit that produced it.
import type { Point } from '@/__tests__/composite-utils'
import type { AtlasId } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import atlasRegistry from '#configs/atlas-registry.json'
import { afterAll, expect, it } from 'vitest'
import { buildApplicationComposite, distance, openView, pointsInBounds, startApplication } from '@/__tests__/composite-utils'
import { getAtlasConfig } from '@/core/atlases/registry'
import { ProjectionService } from '@/services/projection/projection-service'
import { useCompositionStore } from '@/stores/composition'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'

type View = 'unified' | 'split' | 'composite-custom'
type Bounds = [Point, Point]
type Rendering = Record<string, Array<Point | null>>

const TOLERANCE = 1e-6
const WIDTH = 800
const HEIGHT = 600
const FIXTURE = 'src/__tests__/fixtures/view-rendering.json'
const UPDATE = process.env.UPDATE_VIEW_RENDERING === '1'

const VIEWS: View[] = ['unified', 'split', 'composite-custom']

const cases = atlasRegistry.atlases.flatMap(atlas => VIEWS
  .filter(view => atlas.presets.some(preset => preset.type === view))
  .map(view => ({ atlasId: atlas.id as AtlasId, view })))

const reference: Record<string, Rendering> = UPDATE ? {} : JSON.parse(readFileSync(FIXTURE, 'utf8'))

// Clockwise ring: d3-geo reads it as the box, not as the rest of the sphere
function boundsPolygon([[minLon, minLat], [maxLon, maxLat]]: Bounds): GeoJSON.Feature<GeoJSON.Polygon> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[[minLon, minLat], [minLon, maxLat], [maxLon, maxLat], [maxLon, minLat], [minLon, minLat]]],
    },
  }
}

function unionOfBounds(bounds: Bounds[]): Bounds {
  return [
    [Math.min(...bounds.map(b => b[0][0])), Math.min(...bounds.map(b => b[0][1]))],
    [Math.max(...bounds.map(b => b[1][0])), Math.max(...bounds.map(b => b[1][1]))],
  ]
}

async function openAtlas(atlasId: AtlasId) {
  await startApplication(atlasId)

  const result = await useCompositionStore().initializeAtlas({ preserveViewMode: true })
  if (!result.ok) {
    throw new Error(JSON.stringify(result.error))
  }
}

function project(projectionId: string, parameters: ProjectionParameters, bounds: Bounds, fitToSphere: boolean) {
  const service = new ProjectionService()
  service.setProjectionParams(parameters)
  const projection = service.getD3Projection(projectionId, boundsPolygon(bounds), WIDTH, HEIGHT, fitToSphere)
  if (!projection) {
    throw new Error(`Unknown projection ${projectionId}`)
  }
  return pointsInBounds(bounds).map(point => projection(point) ?? null)
}

function renderView(atlasId: AtlasId, view: View): Rendering {
  const atlasConfig = getAtlasConfig(atlasId)
  const territories = atlasConfig.geoDataConfig.territories
  const projectionStore = useProjectionStore()
  const parameterStore = useParameterStore()

  if (view === 'unified') {
    // UnifiedView fits the sphere (ViewOrchestrationService.shouldShowSphere)
    const bounds = unionOfBounds(territories.map(t => t.bounds))
    return { [atlasId]: project(projectionStore.selectedProjection!, parameterStore.globalEffectiveParameters, bounds, true) }
  }

  if (view === 'split') {
    return Object.fromEntries(territories.map(t => [
      t.code,
      project(
        parameterStore.getTerritoryProjection(t.code) ?? projectionStore.selectedProjection!,
        parameterStore.getEffectiveParameters(t.code),
        t.bounds,
        false,
      ),
    ]))
  }

  const composite = buildApplicationComposite(atlasId)
  return Object.fromEntries(atlasConfig.compositeTerritories!.territories.map(t => [
    t.code,
    pointsInBounds(t.bounds).map(point => composite.project(t.code, point)),
  ]))
}

afterAll(() => {
  if (UPDATE) {
    writeFileSync(FIXTURE, `${JSON.stringify(reference, null, 2)}\n`)
  }
})

it.each(cases)('$atlasId $view view keeps its rendering', async ({ atlasId, view }) => {
  await openAtlas(atlasId)
  await openView(view)
  const rendering = renderView(atlasId, view)

  const key = `${atlasId}/${view}`
  if (UPDATE) {
    reference[key] = rendering
    return
  }

  const expected = reference[key]!
  expect(Object.keys(rendering)).toEqual(Object.keys(expected))
  for (const [code, points] of Object.entries(rendering)) {
    points.forEach((point, i) => {
      if (point === null || expected[code]![i] === null) {
        expect(point, `${code} ${i}`).toEqual(expected[code]![i])
      }
      else {
        expect(distance(point, expected[code]![i]!), `${code} ${i}`).toBeLessThanOrEqual(TOLERANCE)
      }
    })
  }
})
