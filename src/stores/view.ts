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

/**
 * View Store
 *
 * Bounded context for view mode and territory selection state.
 *
 * Responsibilities:
 * - View mode selection (unified, split, composite-custom, built-in-composite)
 * - Territory mode within view
 * - Active territory set for custom composite mode
 * - View preset management
 * - UI visibility computed properties (delegated to ProjectionUIService)
 *
 * Domain Model Integration:
 * - viewModeSelection: ViewModeSelection value object for domain behavior
 *
 * Dependencies:
 * - atlasStore: For atlas configuration and territory data
 * - parameterStore: For clearing parameters on view mode changes
 * - uiStore: For toast notifications
 */
export const useViewStore = defineStore('view', () => {
  // Lazy store initialization to avoid circular dependencies
  const getAtlasStore = () => useAtlasStore()
  const getParameterStore = () => useParameterStore()
  const getUIStore = () => useUIStore()
  const presetDefaults = getSharedPresetDefaults()


  // Territory mode - initialize with the default from the atlas store
  const territoryMode = ref<string>(getAtlasStore().getInitialTerritoryMode())

  // View mode - initialize with default from atlas config
  const viewMode = ref<ViewMode>(getDefaultViewMode(getAtlasStore().selectedAtlasId))

  // Active territory set for custom composite mode
  // Tracks which territories are included in the custom composite
  // Initially loaded from preset, can be modified by user
  const activeTerritoryCodes = ref<Set<TerritoryCode>>(new Set())

  // View mode preset tracking
  const currentViewPreset = ref<PresetId | null>(null)
  const availableViewPresets = ref<ResolvedPresetDefinition[]>([])

  // Computed - Domain Model Integration

  /**
   * ViewModeSelection value object
   *
   * Provides domain behavior for the current view mode:
   * - requiresCompositeProjection(): boolean
   * - isComposite(): boolean
   * - isSplit(): boolean
   * - isUnified(): boolean
   * - showsTerritoryControls(): boolean
   * - showsProjectionParams(): boolean
   *
   * Use this for domain logic instead of raw viewMode string comparisons.
   */
  const viewModeSelection = computed(() => new ViewModeSelection(viewMode.value))

  // Computed - UI Visibility

  // Check if view mode selector should be disabled
  const isViewModeLocked = computed(() => {
    const config = getAtlasStore().currentAtlasConfig
    if (!config)
      return false
    // Convert: config.id is string from JSON
    const availableViewModes = getAvailableViewModes(config.id as AtlasId)
    return availableViewModes.length === 1
  })

  // UI visibility computed properties - delegated to ProjectionUIService
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

  // Actions - Basic State Mutations

  function setTerritoryMode(mode: string) {
    territoryMode.value = mode
  }

  function setViewMode(mode: ViewMode) {
    if (mode === viewMode.value)
      return

    viewMode.value = mode
  }

  // Territory set management for custom composite mode
  function addTerritoryToComposite(territoryCode: TerritoryCode) {
    activeTerritoryCodes.value.add(territoryCode)
    // Trigger reactivity by creating new Set
    activeTerritoryCodes.value = new Set(activeTerritoryCodes.value)
  }

  function removeTerritoryFromComposite(territoryCode: TerritoryCode) {
    activeTerritoryCodes.value.delete(territoryCode)
    // Trigger reactivity by creating new Set
    activeTerritoryCodes.value = new Set(activeTerritoryCodes.value)
  }

  function setActiveTerritories(territoryCodes: TerritoryCode[]) {
    activeTerritoryCodes.value = new Set(territoryCodes)
  }

  // Actions - View Preset Management

  /**
   */
  async function loadAvailableViewPresets() {
    // Only load presets for view modes that support them
    if (!['unified', 'split', 'built-in-composite'].includes(viewMode.value)) {
      availableViewPresets.value = []
      return
    }

    try {
      // Get presets from atlas registry
      const allPresets = getAtlasPresets(getAtlasStore().selectedAtlasId)

      // Filter by current view mode and resolve i18n values
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

  /**
   * Auto-load first available preset if any exist
   */
  async function autoLoadFirstPreset(context: string) {
    if (availableViewPresets.value.length === 0) {
      debug('No view presets available to auto-load (%s)', context)
      return
    }

    // Prefer default preset if available
    const defaultPreset = availableViewPresets.value.find(p => p.isDefault)
    const presetToLoad = defaultPreset || availableViewPresets.value[0]

    if (!presetToLoad) {
      return
    }

    try {
      // Convert: presetToLoad.id is string from registry
      await loadViewPreset(presetToLoad.id as PresetId)
      debug('Auto-loaded view preset "%s"%s (%s)', presetToLoad.name, defaultPreset ? ' (default)' : '', context)
    }
    catch (err) {
      debug('Failed to auto-load preset (%s): %O', context, err)
    }
  }

  /**
   */
  async function loadViewPreset(presetId: PresetId) {
    try {
      const result = await PresetLoader.loadPreset(presetId)

      if (!result.success || !result.data) {
        debug('Failed to load view preset: %O', result.errors)
        throw new Error(result.errors.join(', '))
      }

      const preset = result.data

      // Validate preset matches current view mode
      if (preset.type !== viewMode.value) {
        throw new Error(
          `Preset is for ${preset.type} mode, but current mode is ${viewMode.value}`,
        )
      }

      // Apply preset configuration based on view mode
      applyViewPresetConfig(preset)

      // Update current preset
      currentViewPreset.value = presetId as PresetId

      // Log warnings if any
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

  /**
   * Apply view preset configuration to stores
   * Delegates to PresetApplicationService for unified preset application logic
   */
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

  /**
   * Clear current view preset
   */
  function clearViewPreset() {
    currentViewPreset.value = null
  }

  // Watchers

  // Sync watcher to set transition flag BEFORE Vue re-renders
  watch(viewMode, (newMode, oldMode) => {
    const appStore = useAppStore()
    const involvesSplitMode = newMode === 'split' || oldMode === 'split'
    appStore.startSwitchingView(involvesSplitMode)
  }, { flush: 'sync' })

  // Async watcher for preset loading and parameter clearing
  watch(viewMode, async (newMode, oldMode) => {
    clearViewPreset()

    // Clear global projection parameters when switching view modes
    // Each view mode/preset should start fresh with its own parameters
    const parameterStore = getParameterStore()
    parameterStore.setGlobalParameter('rotate', undefined)
    parameterStore.setGlobalParameter('center', undefined)
    parameterStore.setGlobalParameter('parallels', undefined)
    parameterStore.setGlobalParameter('scale', undefined)
    presetDefaults.storeGlobalParameters(null)

    // Clear territory preset defaults when switching away from modes with per-territory reset
    // Both composite-custom and split modes have per-territory projections/parameters
    if (newMode !== 'composite-custom' && newMode !== 'split') {
      presetDefaults.clearAll()
    }

    await loadAvailableViewPresets()

    // For composite-custom mode with no view presets, reload the atlas default preset
    if (newMode === 'composite-custom' && availableViewPresets.value.length === 0) {
      const atlasId = getAtlasStore().selectedAtlasId
      if (atlasId) {
        debug('Reloading default composite preset for composite-custom mode')
        // Re-initialize atlas to reload default preset
        await InitializationService.initializeAtlas({
          atlasId,
          preserveViewMode: true, // Keep composite-custom mode
        })
      }
    }
    else {
      // Auto-load first preset if available
      await autoLoadFirstPreset(`view mode changed from ${oldMode} to ${newMode}`)
    }
  })

  // Track if we're in the middle of reverting to prevent infinite loops
  let isReverting = false

  // Watch atlas changes - use InitializationService for orchestration
  watch(() => getAtlasStore().selectedAtlasId, async (newAtlasId, oldAtlasId) => {
    // Skip if we're reverting from a failed atlas change
    if (isReverting) {
      isReverting = false
      return
    }

    // Preload the new atlas before orchestration to ensure sync access works
    await loadAtlasAsync(newAtlasId)

    // Use InitializationService for consistent atlas change handling
    const result = await InitializationService.initializeAtlas({
      atlasId: newAtlasId,
      preserveViewMode: true, // Try to keep current view mode if supported by new atlas
    })

    if (!result.success) {
      debug('Atlas change failed: %O', result.errors)

      // Revert to old atlas selection
      isReverting = true
      getAtlasStore().selectedAtlasId = oldAtlasId

      // Show error toast to user
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

    // Reload view presets for the new atlas
    await loadAvailableViewPresets()

    // Auto-load first preset if available
    await autoLoadFirstPreset(`atlas changed from ${oldAtlasId} to ${newAtlasId}`)
  })

  return {
    territoryMode,
    viewMode,
    activeTerritoryCodes,
    currentViewPreset,
    availableViewPresets,

    // Domain Model - Value Objects
    viewModeSelection,

    // Computed - UI Visibility
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
