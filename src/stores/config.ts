import type { Preset } from '@/core/presets'
import type { ViewMode } from '@/types'
import type { ResolvedPresetDefinition } from '@/types/registry'

import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useAtlasLoader } from '@/composables/useAtlasLoader'
import { getSharedPresetDefaults } from '@/composables/usePresetDefaults'
import { DEFAULT_ATLAS, getAtlasPresets, getAvailableViewModes, getDefaultViewMode, getLoadedConfig, isAtlasLoaded, loadAtlasAsync } from '@/core/atlases/registry'
import { AtlasService } from '@/services/atlas/atlas-service'
import { InitializationService } from '@/services/initialization/initialization-service'
import { PresetApplicationService } from '@/services/presets/preset-application-service'
import { PresetLoader } from '@/services/presets/preset-loader'
import { ProjectionUIService } from '@/services/projection/projection-ui-service'
import { useParameterStore } from '@/stores/parameters'
import { useUIStore } from '@/stores/ui'
import { logger } from '@/utils/logger'

const debug = logger.store.config

export const useConfigStore = defineStore('config', () => {
  // Initialize new stores for UI and parameter state
  const uiStore = useUIStore()
  const parameterStore = useParameterStore()
  const presetDefaults = getSharedPresetDefaults()

  // State
  const selectedAtlas = ref(DEFAULT_ATLAS)
  const scalePreservation = ref(true)

  // Projection parameters now managed through parameter store
  // Custom overrides are handled via parameterStore.setGlobalParameter()

  // Projection control options
  const rotateLatitudeLocked = ref<boolean>(true) // Default to locked

  // Projection selection - nullable until preset loads
  // No fallback values - must wait for InitializationService to load valid preset
  const selectedProjection = ref<string | null>(null)

  // Use async atlas loader for loading atlas configs on demand
  const { atlasConfig: currentAtlasConfig } = useAtlasLoader(selectedAtlas)

  // Computed: Atlas service for accessing atlas-specific data
  // Depends on both selectedAtlas AND currentAtlasConfig so it updates when atlas finishes loading
  const atlasService = computed(() => {
    // Access currentAtlasConfig to create reactive dependency on loading completion
    void currentAtlasConfig.value?.id

    const isLoaded = isAtlasLoaded(selectedAtlas.value)
    if (!isLoaded) {
      // Return a service for the default atlas as fallback during loading
      return new AtlasService(DEFAULT_ATLAS)
    }
    return new AtlasService(selectedAtlas.value)
  })

  // Territory mode - initialize with the default from the current atlas's config
  const getInitialTerritoryMode = () => {
    // Use cached config since DEFAULT_ATLAS is preloaded in main.ts
    const { atlasConfig } = getLoadedConfig(DEFAULT_ATLAS)
    // Otherwise use first option from territoryModeOptions
    if (atlasConfig.hasTerritorySelector && atlasConfig.territoryModeOptions && atlasConfig.territoryModeOptions.length > 0) {
      return atlasConfig.territoryModeOptions[0]!.value
    }
    throw new Error('No territory mode options available for the default atlas')
  }
  const territoryMode = ref<string>(getInitialTerritoryMode())

  // Initialize viewMode with default atlas config (preloaded)
  const getInitialViewMode = () => {
    return getDefaultViewMode(DEFAULT_ATLAS)
  }
  const viewMode = ref<ViewMode>(getInitialViewMode())

  // Composite projection - nullable until preset loads
  // No fallback values - must wait for InitializationService to load valid preset
  const compositeProjection = ref<string | null>(null)

  // Reference scale from preset - undefined until loaded
  const referenceScale = ref<number | undefined>(undefined)

  // Canvas dimensions from preset - undefined until loaded
  const canvasDimensions = ref<{ width: number, height: number } | undefined>(undefined)

  // Active territory set for custom composite mode
  // Tracks which territories are included in the custom composite
  // Initially loaded from preset, can be modified by user
  const activeTerritoryCodes = ref<Set<string>>(new Set())

  // View mode preset tracking (separate from composite-custom presets)
  const currentViewPreset = ref<string | null>(null)
  const availableViewPresets = ref<ResolvedPresetDefinition[]>([])

  // Computed: Check if view mode selector should be disabled
  const isViewModeLocked = computed(() => {
    const config = currentAtlasConfig.value
    // If config hasn't loaded yet, default to not locked
    if (!config)
      return false
    const availableViewModes = getAvailableViewModes(config.id)
    return availableViewModes.length === 1
  })

  // Initialize UI store with fallback defaults - will be updated async with preset data
  uiStore.initializeDisplayOptions({
    showGraticule: false,
    showCompositionBorders: true,
    showMapLimits: true,
  })

  // REMOVED: Territory defaults initialization
  // This was setting projectionId="mercator" for ALL territories before preset loads,
  // causing territories not in the preset to be rendered with fallback parameters.
  // Territory parameters are now exclusively initialized from presets via initializeFromPreset()
  //
  // const initializeTerritoryDefaults = () => {
  //   const all = atlasService.value.getAllTerritories()
  //   for (const territory of all) {
  //     const currentProjection = parameterStore.getTerritoryProjection(territory.code)
  //     if (!currentProjection) {
  //       parameterStore.setTerritoryProjection(territory.code, 'mercator')
  //     }
  //     const effective = parameterStore.getEffectiveParameters(territory.code)
  //     if (!effective.translateOffset) {
  //       parameterStore.setTerritoryParameter(territory.code, 'translateOffset', [0, 0])
  //     }
  //   }
  // }
  // initializeTerritoryDefaults()

  // Reactivity System Refactor: Removed initializeWithPresetMetadata()
  // Previously used AtlasCoordinator which is now replaced by InitializationService
  // All initialization (startup + atlas changes) now uses InitializationService for consistency

  // Initialize with preset metadata on app startup
  // Use InitializationService for consistent initialization (same as atlas changes)
  ;(async () => {
    try {
      debug('Initializing app with default atlas using InitializationService')
      const result = await InitializationService.initializeAtlas({
        atlasId: selectedAtlas.value,
        preserveViewMode: false,
      })

      if (!result.success) {
        debug('Initial atlas initialization failed: %O', result.errors)
      }
      else {
        debug('Initial atlas initialization complete')
      }
    }
    catch (err) {
      debug('Initial atlas initialization error: %O', err)
    }
  })()

  // Computed
  // Use ProjectionUIService for all UI visibility and grouping logic
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
    ProjectionUIService.getProjectionGroups(selectedAtlas.value, viewMode.value),
  )

  const projectionRecommendations = computed(() =>
    ProjectionUIService.getProjectionRecommendations(selectedAtlas.value, viewMode.value),
  )

  // Actions
  const setScalePreservation = (value: boolean) => {
    scalePreservation.value = value
  }

  const setSelectedProjection = (projection: string) => {
    selectedProjection.value = projection
  }

  const setTerritoryMode = (mode: string) => {
    territoryMode.value = mode
  }

  const setViewMode = (mode: ViewMode) => {
    viewMode.value = mode
  }

  const setCompositeProjection = (projection: string) => {
    compositeProjection.value = projection
  }

  // Territory set management for custom composite mode
  const addTerritoryToComposite = (territoryCode: string) => {
    activeTerritoryCodes.value.add(territoryCode)
    // Trigger reactivity by creating new Set
    activeTerritoryCodes.value = new Set(activeTerritoryCodes.value)
  }

  const removeTerritoryFromComposite = (territoryCode: string) => {
    activeTerritoryCodes.value.delete(territoryCode)
    // Trigger reactivity by creating new Set
    activeTerritoryCodes.value = new Set(activeTerritoryCodes.value)
  }

  const setActiveTerritories = (territoryCodes: string[]) => {
    activeTerritoryCodes.value = new Set(territoryCodes)
  }

  const setCustomRotate = (longitude: number | null, latitude: number | null) => {
    // Convert null values to undefined to remove parameter overrides
    const rotateValue = longitude !== null || latitude !== null
      ? [longitude ?? 0, latitude ?? 0] as [number, number]
      : undefined
    parameterStore.setGlobalParameter('rotate', rotateValue)
  }

  const setCustomCenter = (longitude: number | null, latitude: number | null) => {
    // Convert null values to undefined to remove parameter overrides
    const centerValue = longitude !== null || latitude !== null
      ? [longitude ?? 0, latitude ?? 0] as [number, number]
      : undefined
    parameterStore.setGlobalParameter('center', centerValue)
  }

  const setCustomParallels = (parallel1: number | null, parallel2: number | null) => {
    // Convert null values to undefined to remove parameter overrides
    const parallelsValue = parallel1 !== null || parallel2 !== null
      ? [parallel1 ?? 30, parallel2 ?? 60] as [number, number]
      : undefined
    parameterStore.setGlobalParameter('parallels', parallelsValue)
  }

  const setCustomScale = (scale: number | null) => {
    // Convert null to undefined to remove parameter override
    parameterStore.setGlobalParameter('scale', scale ?? undefined)
  }

  const setRotateLatitudeLocked = (locked: boolean) => {
    rotateLatitudeLocked.value = locked
  }

  const resetProjectionParams = () => {
    // First, clear ALL global parameters
    parameterStore.setGlobalParameter('rotate', undefined)
    parameterStore.setGlobalParameter('center', undefined)
    parameterStore.setGlobalParameter('parallels', undefined)
    parameterStore.setGlobalParameter('scale', undefined)

    // If view preset is active, restore preset parameters
    if (currentViewPreset.value && presetDefaults.presetGlobalParameters.value) {
      parameterStore.setGlobalParameters(presetDefaults.presetGlobalParameters.value)
    }

    rotateLatitudeLocked.value = true // Reset to locked state
  }

  // Individual parameter setters - convenience wrappers
  const setCustomRotateLongitude = (value: number | null) => {
    const currentLatitude = parameterStore.globalParameters.rotate?.[1] ?? null
    setCustomRotate(value, currentLatitude)
  }

  const setCustomRotateLatitude = (value: number | null) => {
    const currentLongitude = parameterStore.globalParameters.rotate?.[0] ?? null
    setCustomRotate(currentLongitude, value)
  }

  const setCustomCenterLongitude = (value: number | null) => {
    const currentLatitude = parameterStore.globalParameters.center?.[1] ?? null
    setCustomCenter(value, currentLatitude)
  }

  const setCustomCenterLatitude = (value: number | null) => {
    const currentLongitude = parameterStore.globalParameters.center?.[0] ?? null
    setCustomCenter(currentLongitude, value)
  }

  const setCustomParallel1 = (value: number | null) => {
    const currentParallel2 = parameterStore.globalParameters.parallels?.[1] ?? null
    setCustomParallels(value, currentParallel2)
  }

  const setCustomParallel2 = (value: number | null) => {
    const currentParallel1 = parameterStore.globalParameters.parallels?.[0] ?? null
    setCustomParallels(currentParallel1, value)
  }

  const initializeTheme = () => {
    uiStore.initializeTheme()
  }

  // View Preset Management
  /**
   * Load available view presets for current atlas and view mode
   */
  async function loadAvailableViewPresets() {
    // Only load presets for view modes that support them
    if (!['unified', 'split', 'built-in-composite'].includes(viewMode.value)) {
      availableViewPresets.value = []
      return
    }

    try {
      // Get presets from atlas registry
      const allPresets = getAtlasPresets(selectedAtlas.value)

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

      debug('Loaded %d view presets for %s %s', presets.length, selectedAtlas.value, viewMode.value)
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
      await loadViewPreset(presetToLoad.id)
      debug('Auto-loaded view preset "%s"%s (%s)', presetToLoad.name, defaultPreset ? ' (default)' : '', context)
    }
    catch (err) {
      debug('Failed to auto-load preset (%s): %O', context, err)
    }
  }

  /**
   * Load and apply a view preset
   */
  async function loadViewPreset(presetId: string) {
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
      currentViewPreset.value = presetId

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

  // Watch view mode changes to load available presets
  // Watch view mode changes - handle preset loading and parameter clearing
  watch(viewMode, async (newMode, oldMode) => {
    clearViewPreset()

    // Clear global projection parameters when switching view modes
    // Each view mode/preset should start fresh with its own parameters
    parameterStore.setGlobalParameter('rotate', undefined)
    parameterStore.setGlobalParameter('center', undefined)
    parameterStore.setGlobalParameter('parallels', undefined)
    parameterStore.setGlobalParameter('scale', undefined)
    presetDefaults.storeGlobalParameters(null)

    await loadAvailableViewPresets()

    // For composite-custom mode with no view presets, reload the atlas default preset
    if (newMode === 'composite-custom' && availableViewPresets.value.length === 0) {
      const atlasId = selectedAtlas.value
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
  watch(selectedAtlas, async (newAtlasId, oldAtlasId) => {
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
      selectedAtlas.value = oldAtlasId

      // Show error toast to user
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

  // Load initial view presets and auto-apply first one
  ;(async () => {
    await loadAvailableViewPresets()

    // Auto-load first preset if available for initial load
    await autoLoadFirstPreset('initial load')
  })()

  return {
    // State
    selectedAtlas,
    scalePreservation,
    selectedProjection,
    territoryMode,
    viewMode,
    compositeProjection,
    referenceScale,
    canvasDimensions,
    activeTerritoryCodes,
    // View preset state
    currentViewPreset,
    availableViewPresets,
    // Parameter accessors - delegate to parameter store
    customRotateLongitude: computed(() => parameterStore.globalParameters.rotate?.[0] ?? null),
    customRotateLatitude: computed(() => parameterStore.globalParameters.rotate?.[1] ?? null),
    customCenterLongitude: computed(() => parameterStore.globalParameters.center?.[0] ?? null),
    customCenterLatitude: computed(() => parameterStore.globalParameters.center?.[1] ?? null),
    customParallel1: computed(() => parameterStore.globalParameters.parallels?.[0] ?? null),
    customParallel2: computed(() => parameterStore.globalParameters.parallels?.[1] ?? null),
    customScale: computed(() => parameterStore.globalParameters.scale ?? null),
    rotateLatitudeLocked,

    // Computed
    atlasService,
    currentAtlasConfig,
    isViewModeLocked,
    showProjectionSelector,
    showIndividualProjectionSelectors,
    showTerritorySelector,
    showScalePreservation,
    showTerritoryControls,
    projectionGroups,
    projectionRecommendations,

    // Actions
    setScalePreservation,
    setSelectedProjection,
    setTerritoryMode,
    setViewMode,
    setCompositeProjection,
    addTerritoryToComposite,
    removeTerritoryFromComposite,
    setActiveTerritories,
    setCustomRotate,
    setCustomCenter,
    setCustomParallels,
    setCustomScale,
    setRotateLatitudeLocked,
    resetProjectionParams,
    // Individual parameter setters - convenience wrappers
    setCustomRotateLongitude,
    setCustomRotateLatitude,
    setCustomCenterLongitude,
    setCustomCenterLatitude,
    setCustomParallel1,
    setCustomParallel2,
    initializeTheme,
    // Reactivity System Refactor: initializeWithPresetMetadata removed
    // Now using InitializationService.initializeAtlas() for all initialization
    // View preset actions
    loadAvailableViewPresets,
    loadViewPreset,
    clearViewPreset,
  }
})
