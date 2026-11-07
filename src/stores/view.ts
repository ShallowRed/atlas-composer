import type { PositioningView } from '@/core/positioning'
import type { Preset } from '@/core/presets'
import type { AtlasId, PresetId, ProjectionId, TerritoryCode, ViewMode } from '@/types'
import type { ProjectionParameters } from '@/types/projection-parameters'
import type { ResolvedPresetDefinition } from '@/types/registry'

import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { resolveI18nValue } from '@/core/atlases/i18n-utils'
import { getAtlasPresets, getDefaultViewMode } from '@/core/atlases/registry'
import i18n from '@/i18n'
import { InitializationService } from '@/services/initialization/initialization-service'
import { PresetLoader } from '@/services/presets/preset-loader'
import { ProjectionUIService } from '@/services/projection/projection-ui-service'
import { useAppStore } from '@/stores/app'
import { useAtlasStore } from '@/stores/atlas'
import { useParameterStore } from '@/stores/parameters'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'
import { useProjectionStore } from '@/stores/projection'
import { useUIStore } from '@/stores/ui'
import { logger } from '@/utils/logger'

const debug = logger.store.config

export const useViewStore = defineStore('view', () => {
  const getAtlasStore = () => useAtlasStore()
  const getParameterStore = () => useParameterStore()
  const getUIStore = () => useUIStore()
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
    ProjectionUIService.getProjectionGroups(getAtlasStore().selectedAtlasId, viewMode.value),
  )

  const projectionRecommendations = computed(() =>
    ProjectionUIService.getProjectionRecommendations(getAtlasStore().selectedAtlasId, viewMode.value),
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

    try {
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
    catch (err) {
      debug('Failed to load available view presets: %O', err)
      availableViewPresets.value = []
    }
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

    try {
      await loadViewPreset(presetToLoad.id as PresetId)
      debug('Auto-loaded view preset "%s"%s (%s)', presetToLoad.name, defaultPreset ? ' (default)' : '', context)
    }
    catch (err) {
      debug('Failed to auto-load preset (%s): %O', context, err)
    }
  }

  async function loadViewPreset(presetId: PresetId) {
    try {
      const result = await PresetLoader.loadPreset(presetId)

      if (!result.success || !result.data) {
        debug('Failed to load view preset: %O', result.errors)
        throw new Error(result.errors.join(', '))
      }

      const preset = result.data

      if (preset.type !== viewMode.value) {
        throw new Error(
          `Preset is for ${preset.type} mode, but current mode is ${viewMode.value}`,
        )
      }

      applyViewPresetConfig(preset)

      currentViewPreset.value = presetId as PresetId

      if (result.warnings.length > 0) {
        debug('View preset warnings: %O', result.warnings)
      }

      debug('View preset loaded successfully: %s', presetId)
    }
    catch (err) {
      debug('Error loading view preset: %O', err)
      throw err
    }
  }

  function applyViewPresetConfig(preset: Preset) {
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
      case 'composite-custom':
        throw new Error('Composite-custom presets should be loaded through atlas initialization, not view preset API')
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

  watch(viewMode, async (newMode, oldMode) => {
    clearViewPreset()

    const parameterStore = getParameterStore()
    parameterStore.setGlobalParameters({ rotate: undefined, center: undefined })
    parameterStore.setGlobalParameter('parallels', undefined)
    parameterStore.setGlobalParameter('scale', undefined)
    presetDefaults.storeGlobalParameters(null)

    if (newMode !== 'composite-custom' && newMode !== 'split') {
      presetDefaults.clearAll()
    }

    await loadAvailableViewPresets()

    if (newMode === 'composite-custom' && availableViewPresets.value.length === 0) {
      const atlasId = getAtlasStore().selectedAtlasId
      if (atlasId) {
        debug('Reloading default composite preset for composite-custom mode')
        await InitializationService.initializeAtlas({
          atlasId,
          preserveViewMode: true, // Keep composite-custom mode
        })
      }
    }
    else {
      await autoLoadFirstPreset(`view mode changed from ${oldMode} to ${newMode}`)
    }
  })

  let isReverting = false

  async function switchAtlas(atlasId: AtlasId, reason: string) {
    const result = await InitializationService.initializeAtlas({
      atlasId,
      preserveViewMode: true,
    })

    if (result.success) {
      await loadAvailableViewPresets()
      await autoLoadFirstPreset(reason)
    }

    return result
  }

  watch(() => getAtlasStore().selectedAtlasId, async (newAtlasId, oldAtlasId) => {
    if (isReverting) {
      isReverting = false
      return
    }

    const result = await switchAtlas(newAtlasId, `atlas changed from ${oldAtlasId} to ${newAtlasId}`)

    if (result.success) {
      debug('Atlas changed: %s -> %s', oldAtlasId, newAtlasId)
      return
    }

    debug('Atlas change failed: %O', result.errors)

    isReverting = true
    getAtlasStore().selectedAtlasId = oldAtlasId

    getUIStore().showToast(
      `Cannot switch to ${newAtlasId}: ${result.errors[0] ?? 'Failed to switch atlas'}`,
      'error',
      5000,
    )

    // The failed initialization cleared the data of the previous atlas
    const restored = await switchAtlas(oldAtlasId, `atlas restored after failing to load ${newAtlasId}`)
    if (!restored.success) {
      debug('Atlas restore failed: %O', restored.errors)
    }
  })

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
    loadViewPreset,
    clearViewPreset,
  }
})
