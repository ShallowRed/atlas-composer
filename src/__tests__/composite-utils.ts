import type { CanvasDimensions, CompositeProjectionConfig } from '@atlas-composer/specification'
import type { AtlasId, PresetId } from '@/types/branded'
import { ProjectionLoader } from '@atlas-composer/projection-loader'
import { d3ProjectionFactories } from '@atlas-composer/projection-loader/helpers'
import { DEFAULT_REFERENCE_SCALE } from '@atlas-composer/specification'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { loadAtlasFromConfigs } from '@/__tests__/test-utils'
import { useParameterProvider } from '@/composables/useParameterProvider'
import { getAtlasConfig } from '@/core/atlases/registry'
import { DEFAULT_CANVAS_DIMENSIONS } from '@/core/projections/defaults'
import { CompositeExportService } from '@/services/export/composite-export-service'
import { CompositeImportService } from '@/services/export/composite-import-service'
import { InitializationService } from '@/services/initialization/initialization-service'
import { CompositeProjection } from '@/services/projection/composite-projection'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'

export type Point = [number, number]

interface ApplicationComposite {
  project: (territoryCode: string, point: Point) => Point | null
  exportToJSON: () => CompositeProjectionConfig
}

export async function startApplication(atlasId: AtlasId) {
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
  const geoDataStore = useGeoDataStore()
  vi.spyOn(geoDataStore, 'loadAllAtlasData').mockResolvedValue()
  vi.spyOn(geoDataStore, 'reinitialize').mockResolvedValue()
}

export function buildApplicationComposite(atlasId: AtlasId): ApplicationComposite {
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
      projectionStore.referenceScale ?? DEFAULT_REFERENCE_SCALE,
      projectionStore.canvasDimensions ?? DEFAULT_CANVAS_DIMENSIONS,
    ),
  }
}

// Path of the import modal: the file is read by CompositeImportService, then applied
export async function importIntoApplication(json: string, canvasDimensions?: CanvasDimensions): Promise<ApplicationComposite> {
  const atlasId = JSON.parse(json).metadata.atlasId as AtlasId
  await startApplication(atlasId)
  const projectionStore = useProjectionStore()
  if (canvasDimensions) {
    projectionStore.canvasDimensions = canvasDimensions
  }

  const read = CompositeImportService.importFromJSON(json, {
    atlasConfig: getAtlasConfig(atlasId),
    canvasDimensions: projectionStore.canvasDimensions ?? DEFAULT_CANVAS_DIMENSIONS,
  })
  if (!read.ok) {
    throw new Error(read.error.join(', '))
  }

  const result = await InitializationService.importConfiguration({ config: read.value })
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

export function loadWithLoader(config: CompositeProjectionConfig, territoryCode: string) {
  const loader = new ProjectionLoader()
  loader.registerAll(d3ProjectionFactories)
  const { width, height } = config.canvasDimensions
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
