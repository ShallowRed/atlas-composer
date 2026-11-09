import type { PositioningView } from '@/core/positioning'
import type { Preset } from '@/core/presets'
import type { PresetError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { PresetId, ProjectionId, TerritoryCode, ViewMode } from '@/types'
import type { ProjectionParameters } from '@/types/projection-parameters'
import type { ResolvedPresetDefinition } from '@/types/registry'

import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { resolveI18nValue } from '@/core/atlases/i18n-utils'
import { getAtlasPresets, getDefaultViewMode } from '@/core/atlases/registry'
import { err, ok } from '@/core/types/result'
import i18n from '@/i18n'
import { PresetLoader } from '@/services/presets/preset-loader'
import { ProjectionUIService } from '@/services/projection/projection-ui-service'
import { useAppStore } from '@/stores/app'
import { useAtlasStore } from '@/stores/atlas'
import { useParameterStore } from '@/stores/parameters'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'
import { useProjectionStore } from '@/stores/projection'
import { logger } from '@/utils/logger'

const debug = logger.store.config

export const useViewStore = defineStore('view', () => {
  const getAtlasStore = () => useAtlasStore()
  const getParameterStore = () => useParameterStore()
  const presetDefaults = usePresetDefaultsStore()

  const territoryMode = ref<string>(getAtlasStore().getInitialTerritoryMode())
  const viewMode = ref<ViewMode>(getDefaultViewMode(getAtlasStore().selectedAtlasId))
  const activeTerritoryCodes = ref<Set<TerritoryCode>>(new Set())
  const currentViewPreset = ref<PresetId | null>(null)
  const availableViewPresets = ref<ResolvedPresetDefinition[]>([])

  const positioningView = computed<PositioningView>(() =>
    viewMode.value === 'composite-custom' ? 'composite' : 'global',
  )

  const showProjectionSelector = computed(() =>
    ProjectionUIService.shouldShowProjectionSelector(
      viewMode.value,
      currentViewPreset.value !== null,
    ),
  )

  const showIndividualProjectionSelectors = computed(() =>
    ProjectionUIService.shouldShowIndividualProjectionSelectors(viewMode.value),
  )

  const projectionGroups = computed(() =>
    ProjectionUIService.getProjectionGroups(viewMode.value),
  )

  const projectionRecommendations = computed(() =>
    ProjectionUIService.getProjectionRecommendations(
      getAtlasStore().currentAtlasConfig?.projectionPreferences?.recommended,
      viewMode.value,
    ),
  )

  function setTerritoryMode(mode: string) {
    territoryMode.value = mode
  }

  function setViewMode(mode: ViewMode) {
    if (mode === viewMode.value)
      return

    viewMode.value = mode
  }

  function addTerritoryToComposite(territoryCode: TerritoryCode) {
    activeTerritoryCodes.value.add(territoryCode)
    activeTerritoryCodes.value = new Set(activeTerritoryCodes.value)
  }

  function removeTerritoryFromComposite(territoryCode: TerritoryCode) {
    activeTerritoryCodes.value.delete(territoryCode)
    activeTerritoryCodes.value = new Set(activeTerritoryCodes.value)
  }

  function setActiveTerritories(territoryCodes: TerritoryCode[]) {
    activeTerritoryCodes.value = new Set(territoryCodes)
  }

  async function loadAvailableViewPresets() {
    if (!['unified', 'split', 'built-in-composite'].includes(viewMode.value)) {
      availableViewPresets.value = []
      return
    }

    const allPresets = getAtlasPresets(getAtlasStore().selectedAtlasId)

    const locale = i18n.global.locale.value

    const presets = allPresets
      .filter(p => p.type === viewMode.value)
      .map(p => ({
        ...p,
        name: resolveI18nValue(p.name, locale),
        description: p.description ? resolveI18nValue(p.description, locale) : undefined,
      }))

    availableViewPresets.value = presets

    debug('Loaded %d view presets for %s %s', presets.length, getAtlasStore().selectedAtlasId, viewMode.value)
  }

  async function autoLoadFirstPreset(context: string) {
    if (availableViewPresets.value.length === 0) {
      debug('No view presets available to auto-load (%s)', context)
      return
    }

    const defaultPreset = availableViewPresets.value.find(p => p.isDefault)
    const presetToLoad = defaultPreset || availableViewPresets.value[0]

    if (!presetToLoad) {
      return
    }

    const result = await loadViewPreset(presetToLoad.id as PresetId)
    if (result.ok) {
      debug('Auto-loaded view preset "%s"%s (%s)', presetToLoad.name, defaultPreset ? ' (default)' : '', context)
    }
    else {
      debug('Failed to auto-load preset (%s): %O', context, result.error)
    }
  }

  async function loadViewPreset(presetId: PresetId): Promise<Result<void, PresetError>> {
    const result = await PresetLoader.loadPreset(presetId)
    if (!result.ok) {
      return result
    }

    const preset = result.value

    if (preset.type !== viewMode.value || preset.type === 'composite-custom') {
      return err({ code: 'PRESET_NOT_APPLICABLE', presetId, presetType: preset.type, viewMode: viewMode.value })
    }

    applyViewPresetConfig(preset)

    currentViewPreset.value = presetId as PresetId

    debug('View preset loaded successfully: %s', presetId)
    return ok(undefined)
  }

  function applyViewPresetConfig(preset: Exclude<Preset, { type: 'composite-custom' }>) {
    const parameterStore = getParameterStore()
    const projectionStore = useProjectionStore()

    switch (preset.type) {
      case 'unified': {
        projectionStore.selectedProjection = preset.config.projection.id as ProjectionId
        const parameters = preset.config.projection.parameters
          ? { ...preset.config.projection.parameters } as ProjectionParameters
          : null
        parameterStore.setAtlasParameters(parameters ?? {})
        presetDefaults.storeGlobalParameters(parameters)
        break
      }
      case 'split':
        for (const [code, territoryConfig] of Object.entries(preset.config.territories ?? {})) {
          parameterStore.setTerritoryProjection(code as TerritoryCode, territoryConfig.projection.id as ProjectionId)
          if (territoryConfig.projection.parameters) {
            parameterStore.setTerritoryParameters(code as TerritoryCode, territoryConfig.projection.parameters)
          }
        }
        break
      case 'built-in-composite':
        projectionStore.compositeProjection = preset.config.projectionId as ProjectionId
        if (preset.config.globalScale !== undefined) {
          debug('Global scale from preset (not applied): %d', preset.config.globalScale)
        }
        break
      default:
        throw new Error(`Unknown preset type: ${(preset as { type: string }).type}`)
    }
  }

  function clearViewPreset() {
    currentViewPreset.value = null
  }

  watch(viewMode, (newMode, oldMode) => {
    const appStore = useAppStore()
    const involvesSplitMode = newMode === 'split' || oldMode === 'split'
    appStore.startSwitchingView(involvesSplitMode)
  }, { flush: 'sync' })

  return {
    territoryMode,
    viewMode,
    activeTerritoryCodes,
    currentViewPreset,
    availableViewPresets,

    positioningView,

    showProjectionSelector,
    showIndividualProjectionSelectors,
    projectionGroups,
    projectionRecommendations,

    setTerritoryMode,
    setViewMode,
    addTerritoryToComposite,
    removeTerritoryFromComposite,
    setActiveTerritories,
    loadAvailableViewPresets,
    autoLoadFirstPreset,
    loadViewPreset,
    clearViewPreset,
  }
})
