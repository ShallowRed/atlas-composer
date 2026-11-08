import type { Translation } from '@/types'
import type { ProjectionId, TerritoryCode } from '@/types/branded'
import type {
  ApplicationState,
  ImportOptions,
  InitializationResult,
} from '@/types/initialization'

import { getAtlasConfig } from '@/core/atlases/registry'
import { useAtlasStore } from '@/stores/atlas'
import { geoDataFailure, useCompositionStore } from '@/stores/composition'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'

export class InitializationService {
  static async importConfiguration(options: ImportOptions): Promise<InitializationResult> {
    const { config, validateAtlasCompatibility = true } = options

    try {
      const atlasStore = useAtlasStore()
      const projectionStore = useProjectionStore()
      const viewStore = useViewStore()
      const currentAtlasId = atlasStore.selectedAtlasId
      const atlasConfig = getAtlasConfig(currentAtlasId)

      if (!config.territories || Object.keys(config.territories).length === 0) {
        return {
          success: false,
          errors: ['Import configuration has no territories'],
          warnings: [],
          state: null,
        }
      }

      if (validateAtlasCompatibility && config.metadata.atlasId !== currentAtlasId) {
        return {
          success: false,
          errors: [`Import is for atlas '${config.metadata.atlasId}' but current atlas is '${currentAtlasId}'`],
          warnings: [],
          state: null,
        }
      }

      const projections: Record<TerritoryCode, ProjectionId> = {} as Record<TerritoryCode, ProjectionId>
      const translations: Record<TerritoryCode, Translation> = {} as Record<TerritoryCode, Translation>
      const scales: Record<TerritoryCode, number> = {} as Record<TerritoryCode, number>
      const territoryParameters: Record<string, Record<string, unknown>> = {}

      for (const territory of config.territories) {
        const code = territory.code as TerritoryCode
        projections[code] = territory.projection.id as ProjectionId
        translations[code] = {
          x: territory.layout.translateOffset[0],
          y: territory.layout.translateOffset[1],
        }
        scales[code] = territory.projection.parameters.scaleMultiplier ?? 1

        const params: Record<string, unknown> = {
          ...territory.projection.parameters,
          translateOffset: territory.layout.translateOffset,
        }

        if (territory.layout.pixelClipExtent) {
          params.pixelClipExtent = territory.layout.pixelClipExtent
        }

        territoryParameters[territory.code] = params
      }

      const state: ApplicationState = {
        atlas: {
          id: currentAtlasId,
          config: atlasConfig,
        },
        viewMode: 'composite-custom',
        territoryMode: viewStore.territoryMode,
        preset: null, // Imported config is not a saved preset
        projections: {
          selected: projectionStore.selectedProjection,
          composite: projectionStore.compositeProjection,
        },
        parameters: {
          global: {},
          territories: territoryParameters as any,
        },
        territories: {
          projections,
          translations,
          scales,
        },
        canvas: {
          referenceScale: config.referenceScale,
          dimensions: config.canvasDimensions,
        },
        display: {
          showGraticule: false,
          showCompositionBorders: true,
          showMapLimits: true,
        },
      }

      await useCompositionStore().applyStateToStores(state)

      const geoDataResult = await useCompositionStore().ensureAtlasDataLoaded(viewStore.territoryMode)
      if (!geoDataResult.ok) {
        return {
          success: false,
          errors: [geoDataFailure(geoDataResult.error)],
          warnings: [],
          state: null,
        }
      }

      return {
        success: true,
        errors: [],
        warnings: [],
        state,
      }
    }
    catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error during import'],
        warnings: [],
        state: null,
      }
    }
  }
}
