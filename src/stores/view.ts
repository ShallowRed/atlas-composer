import type { Preset } from '@/core/presets'
import type { AtlasId, PresetId, TerritoryCode, ViewMode } from '@/types'
import type { ResolvedPresetDefinition } from '@/types/registry'

import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { getSharedPresetDefaults } from '@/composables/usePresetDefaults'
import { getAtlasPresets, getAvailableViewModes, getDefaultViewMode, loadAtlasAsync } from '@/core/atlases/registry'
import { ViewModeSelection } from '@/core/view'
import { InitializationService } from '@/services/initialization/initialization-service'
import { PresetApplicationService } from '@/services/presets/preset-application-service'
import { PresetLoader } from '@/services/presets/preset-loader'
import { ProjectionUIService } from '@/services/projection/projection-ui-service'
import { useAppStore } from '@/stores/app'
import { useAtlasStore } from '@/stores/atlas'
import { useParameterStore } from '@/stores/parameters'
import { useUIStore } from '@/stores/ui'
import { logger } from '@/utils/logger'

const debug = logger.store.config

export const useViewStore = defineStore('view', () => {
  const getAtlasStore = () => useAtlasStore()
  const getParameterStore = () => useParameterStore()
  const getUIStore = () => useUIStore()
  const presetDefaults = getSharedPresetDefaults()

  const territoryMode = ref<string>(getAtlasStore().getInitialTerritoryMode())
  const viewMode = ref<ViewMode>(getDefaultViewMode(getAtlasStore().selectedAtlasId))
  const activeTerritoryCodes = ref<Set<TerritoryCode>>(new Set())
  const currentViewPreset = ref<PresetId | null>(null)
  const availableViewPresets = ref<ResolvedPresetDefinition[]>([])

  const viewModeSelection = computed(() => new ViewModeSelection(viewMode.value))

  const isViewModeLocked = computed(() => {
    const config = getAtlasStore().currentAtlasConfig
    if (!config)
      return false
    const availableViewModes = getAvailableViewModes(config.id as AtlasId)
    return availableViewModes.length === 1
  })

  const showProjectionSelector = computed(() =>
    ProjectionUIService.shouldShowProjectionSelector(
      viewMode.value,
      currentViewPreset.value !== null,
    ),
  )

  const showIndividualProjectionSelectors = computed(() =>
    ProjectionUIService.shouldShowIndividualProjectionSelectors(viewMode.value),
  )

  const showTerritorySelector = computed(() =>
    ProjectionUIService.shouldShowTerritorySelector(viewMode.value),
  )

  const showScalePreservation = computed(() =>
    ProjectionUIService.shouldShowScalePreservation(viewMode.value),
  )

  const showTerritoryControls = computed(() =>
    ProjectionUIService.shouldShowTerritoryControls(viewMode.value),
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

      const { resolveI18nValue, getCurrentLocale } = await import('@/core/atlases/i18n-utils')
      const locale = getCurrentLocale()

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
    const result = PresetApplicationService.applyPreset(preset)

    if (!result.success) {
      debug('Failed to apply preset: %O', result.errors)
      throw new Error(result.errors.join(', '))
    }

    if (result.warnings.length > 0) {
      debug('Preset applied with warnings: %O', result.warnings)
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
    parameterStore.setGlobalParameter('rotate', undefined)
    parameterStore.setGlobalParameter('center', undefined)
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

  watch(() => getAtlasStore().selectedAtlasId, async (newAtlasId, oldAtlasId) => {
    if (isReverting) {
      isReverting = false
      return
    }

    await loadAtlasAsync(newAtlasId)

    const result = await InitializationService.initializeAtlas({
      atlasId: newAtlasId,
      preserveViewMode: true,
    })

    if (!result.success) {
      debug('Atlas change failed: %O', result.errors)

      isReverting = true
      getAtlasStore().selectedAtlasId = oldAtlasId

      const uiStore = getUIStore()
      const errorMessage = result.errors && result.errors.length > 0
        ? result.errors[0]
        : 'Failed to switch atlas'

      uiStore.showToast(
        `Cannot switch to ${newAtlasId}: ${errorMessage}`,
        'error',
        5000,
      )

      return
    }

    if (!result.state) {
      debug('Atlas change returned no state')
      return
    }

    debug('Atlas changed successfully: %s -> %s (viewMode: %s, territories: %d)', oldAtlasId, newAtlasId, result.state.viewMode, Object.keys(result.state.parameters.territories).length)

    await loadAvailableViewPresets()

    await autoLoadFirstPreset(`atlas changed from ${oldAtlasId} to ${newAtlasId}`)
  })

  return {
    territoryMode,
    viewMode,
    activeTerritoryCodes,
    currentViewPreset,
    availableViewPresets,

    viewModeSelection,

    isViewModeLocked,
    showProjectionSelector,
    showIndividualProjectionSelectors,
    showTerritorySelector,
    showScalePreservation,
    showTerritoryControls,
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
