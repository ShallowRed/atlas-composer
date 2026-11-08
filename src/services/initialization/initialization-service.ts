import type { Translation } from '@/types'
import type { ProjectionId, TerritoryCode } from '@/types/branded'
import type {
  ApplicationState,
  ImportOptions,
  InitializationResult,
  PresetLoadOptions,
} from '@/types/initialization'

import { getAtlasConfig } from '@/core/atlases/registry'
import { PresetLoader } from '@/services/presets/preset-loader'
import { PresetValidationService } from '@/services/validation/preset-validation-service'
import { useAppStore } from '@/stores/app'
import { useAtlasStore } from '@/stores/atlas'
import { geoDataFailure, useCompositionStore } from '@/stores/composition'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'

export class InitializationService {
  static async loadPreset(options: PresetLoadOptions): Promise<InitializationResult> {
    const { presetId, skipValidation = false } = options
    const appStore = useAppStore()

    try {
      appStore.startLoadingPreset()

      const atlasStore = useAtlasStore()
      const projectionStore = useProjectionStore()
      const viewStore = useViewStore()
      const currentAtlasId = atlasStore.selectedAtlasId
      const atlasConfig = getAtlasConfig(currentAtlasId)
      const presetResult = await PresetLoader.loadPreset(presetId)
      if (!presetResult.success || !presetResult.data) {
        appStore.setReady()
        return {
          success: false,
          errors: [`Failed to load preset '${presetId}': ${presetResult.errors.join(', ')}`],
          warnings: presetResult.warnings || [],
          state: null,
        }
      }

      const preset = presetResult.data

      if (!skipValidation) {
        const validation = PresetValidationService.validatePreset(preset, atlasConfig)
        if (!validation.isValid) {
          appStore.setReady()
          return {
            success: false,
            errors: validation.errors,
            warnings: validation.warnings,
            state: null,
          }
        }
      }

      let state: ApplicationState | null = null

      if (preset.type === 'composite-custom') {
        const territoryDefaults = PresetLoader.convertToDefaults(preset.config)
        const territoryParameters = PresetLoader.extractTerritoryParameters(preset.config)

        state = {
          atlas: {
            id: currentAtlasId,
            config: atlasConfig,
          },
          viewMode: 'composite-custom',
          territoryMode: viewStore.territoryMode,
          preset: {
            id: presetId,
            type: preset.type,
            data: preset,
          },
          projections: {
            selected: projectionStore.selectedProjection,
            composite: projectionStore.compositeProjection,
          },
          parameters: {
            global: {},
            territories: territoryParameters as any,
          },
          territories: {
            projections: territoryDefaults.projections,
            translations: territoryDefaults.translations,
            scales: territoryDefaults.scales,
          },
          canvas: {
            referenceScale: preset.config.referenceScale,
            dimensions: preset.config.canvasDimensions,
          },
          display: {
            showGraticule: false,
            showCompositionBorders: true,
            showMapLimits: true,
          },
        }
      }
      else {
        appStore.setReady()
        return {
          success: true,
          errors: [],
          warnings: [],
          state: null,
        }
      }

      if (state) {
        await useCompositionStore().applyStateToStores(state)
        const geoDataResult = await useCompositionStore().ensureAtlasDataLoaded(viewStore.territoryMode)
        if (!geoDataResult.ok) {
          const message = geoDataFailure(geoDataResult.error)
          appStore.setError(message)
          return {
            success: false,
            errors: [message],
            warnings: [],
            state: null,
          }
        }
      }
      appStore.setReady()

      return {
        success: true,
        errors: [],
        warnings: presetResult.warnings || [],
        state,
      }
    }
    catch (error) {
      const appStore = useAppStore()
      appStore.setError(error instanceof Error ? error.message : 'Unknown error')
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error during preset loading'],
        warnings: [],
        state: null,
      }
    }
  }

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
