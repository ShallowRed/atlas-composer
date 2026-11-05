import type { AtlasId, PresetId } from '@/types/branded'
import type { ExportedCompositeConfig } from '@/types/export-config'
import { ProjectionLoader } from '@atlas-composer/projection-loader'
import { d3ProjectionFactories } from '@atlas-composer/projection-loader/helpers'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { loadAtlasFromConfigs } from '@/__tests__/test-utils'
import { useParameterProvider } from '@/composables/useParameterProvider'
import { getAtlasConfig } from '@/core/atlases/registry'
import { CompositeExportService } from '@/services/export/composite-export-service'
import { InitializationService } from '@/services/initialization/initialization-service'
import { CompositeProjection } from '@/services/projection/composite-projection'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'

export type Point = [number, number]

interface ApplicationComposite {
  project: (territoryCode: string, point: Point) => Point | null
  exportToJSON: () => ExportedCompositeConfig
}

async function startApplication(atlasId: AtlasId) {
  setActivePinia(createPinia())
  await loadAtlasFromConfigs(atlasId)
  const atlasStore = useAtlasStore()
  atlasStore.selectedAtlasId = atlasId
  if (!getAtlasConfig(atlasId).hasTerritorySelector) {
    // Mode that InitializationService.initializeAtlas gives to an atlas without territory selector
    vi.spyOn(atlasStore, 'getInitialTerritoryMode').mockReturnValue('all-territories')
  }
  // Created after the atlas selection, so that its watcher does not initialize the atlas again
  useViewStore()
  // The geographic data of src/public/data is not versioned
  vi.spyOn(useGeoDataStore(), 'loadAllAtlasData').mockResolvedValue()
}

function buildApplicationComposite(atlasId: AtlasId): ApplicationComposite {
  const projectionStore = useProjectionStore()
  const { parameterProvider } = useParameterProvider()
  const atlasConfig = getAtlasConfig(atlasId)
  const composite = new CompositeProjection(
    atlasConfig.compositeProjectionConfig!,
    parameterProvider,
    projectionStore.referenceScale,
    projectionStore.canvasDimensions,
  )

  return {
    project: (territoryCode, point) => {
      const { width, height } = projectionStore.canvasDimensions!
      composite.build(width, height, true)
      return composite.getSubProjectionData(territoryCode)?.projection(point) ?? null
    },
    exportToJSON: () => CompositeExportService.exportToJSON(
      composite,
      atlasId,
      atlasConfig.name,
      parameterProvider,
      projectionStore.referenceScale,
      projectionStore.canvasDimensions ?? undefined,
    ),
  }
}

export async function importIntoApplication(config: ExportedCompositeConfig): Promise<ApplicationComposite> {
  const atlasId = config.metadata.atlasId as AtlasId
  await startApplication(atlasId)

  const result = await InitializationService.importConfiguration({ config })
  if (!result.success) {
    throw new Error(result.errors.join(', '))
  }

  return buildApplicationComposite(atlasId)
}

export async function loadPresetIntoApplication(atlasId: AtlasId, presetId: PresetId): Promise<ApplicationComposite> {
  await startApplication(atlasId)

  const result = await InitializationService.loadPreset({ presetId })
  if (!result.success) {
    throw new Error(result.errors.join(', '))
  }

  return buildApplicationComposite(atlasId)
}

export function loadWithLoader(config: ExportedCompositeConfig, territoryCode: string) {
  const loader = new ProjectionLoader()
  loader.registerAll(d3ProjectionFactories)
  const { width, height } = config.canvasDimensions!
  // Clipping hides the points outside the pixel extent; the comparison bears on the projected coordinates
  const territories = config.territories
    .filter(t => t.code === territoryCode)
    .map(t => ({ ...t, layout: { ...t.layout, pixelClipExtent: null } }))
  return loader.loadFromJSON(JSON.stringify({ ...config, territories }), { width, height })
}

export function pointsInBounds([[minLon, minLat], [maxLon, maxLat]]: [Point, Point]): Point[] {
  const fractions = [0.25, 0.5, 0.75]
  return fractions.flatMap(fx => fractions.map((fy): Point => [
    minLon + (maxLon - minLon) * fx,
    minLat + (maxLat - minLat) * fy,
  ]))
}

export function distance(a: Point | null, b: Point | null): number {
  if (!a || !b) {
    return Number.POSITIVE_INFINITY
  }
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}
