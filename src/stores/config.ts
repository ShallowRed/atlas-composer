import type { Preset, PresetRegistryEntry } from '@/core/presets'
import type { ViewMode } from '@/types'

import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useAtlasLoader } from '@/composables/useAtlasLoader'
import { getSharedPresetDefaults } from '@/composables/usePresetDefaults'
import { DEFAULT_ATLAS, getLoadedConfig, isAtlasLoaded, loadAtlasAsync } from '@/core/atlases/registry'
import { AtlasCoordinator } from '@/services/atlas/atlas-coordinator'
import { AtlasService } from '@/services/atlas/atlas-service'
import { InitializationService } from '@/services/initialization/initialization-service'
import { PresetApplicationService } from '@/services/presets/preset-application-service'
import { PresetLoader } from '@/services/presets/preset-loader'
import { ProjectionUIService } from '@/services/projection/projection-ui-service'
import { useParameterStore } from '@/stores/parameters'
import { useUIStore } from '@/stores/ui'

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

  // Projection fitting mode: 'auto' uses domain fitting, 'manual' uses center+scale
  const projectionFittingMode = ref<'auto' | 'manual'>('auto')

  // Initialize selectedProjection - use fallback, will be updated async with preset data
  const getInitialProjection = () => {
    // Use fallback default for immediate initialization
    // AtlasMetadataService will update this asynchronously with preset data
    return 'natural-earth'
  }
  const selectedProjection = ref(getInitialProjection())

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
    // Use configured default territory mode if available
    if (atlasConfig.defaultTerritoryMode) {
      return atlasConfig.defaultTerritoryMode
    }
    // Otherwise use first option from territoryModeOptions
    if (atlasConfig.hasTerritorySelector && atlasConfig.territoryModeOptions && atlasConfig.territoryModeOptions.length > 0) {
      return atlasConfig.territoryModeOptions[0]!.value
    }
    throw new Error('No territory mode options available for the default atlas')
  }
  const territoryMode = ref<string>(getInitialTerritoryMode())

  // Initialize viewMode with default atlas config (preloaded)
  const getInitialViewMode = () => {
    const { atlasConfig } = getLoadedConfig(DEFAULT_ATLAS)
    return atlasConfig.defaultViewMode
  }
  const viewMode = ref<ViewMode>(getInitialViewMode())
  // Initialize with fallback, will be updated async with preset data
  const compositeProjection = ref<string>('conic-conformal-france')
  // Reference scale from preset, will be updated async with preset data
  const referenceScale = ref<number | undefined>(undefined)
  // Canvas dimensions from preset, will be updated async with preset data (defaults to 960×500)
  const canvasDimensions = ref<{ width: number, height: number } | undefined>(undefined)

  // View mode preset tracking (separate from composite-custom presets)
  const currentViewPreset = ref<string | null>(null)
  const availableViewPresets = ref<PresetRegistryEntry[]>([])

  // Computed: Check if view mode selector should be disabled
  const isViewModeLocked = computed(() => {
    const config = currentAtlasConfig.value
    // If config hasn't loaded yet, default to not locked
    if (!config)
      return false
    return config.supportedViewModes.length === 1
  })

  // Initialize UI store with fallback defaults - will be updated async with preset data
  uiStore.initializeDisplayOptions({
    showGraticule: false,
    showSphere: false,
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

  // Guard to prevent multiple simultaneous initializations
  let initializationPromise: Promise<void> | null = null

  // Async initialization to load metadata and territory defaults from presets
  const initializeWithPresetMetadata = async () => {
    // If already initializing, return the existing promise
    if (initializationPromise) {
      return initializationPromise
    }

    // Create and store the initialization promise
    initializationPromise = (async () => {
      try {
        const currentAtlasId = selectedAtlas.value

        // Use AtlasCoordinator to load complete preset data (just like the atlas change watcher)
        const updates = await AtlasCoordinator.handleAtlasChange(currentAtlasId, viewMode.value)

        // CRITICAL: Initialize parameters FIRST (includes projectionId, scaleMultiplier, and all other parameters)
        // This must happen before setting individual projections/translations/scales
        if (updates.territoryParameters && Object.keys(updates.territoryParameters).length > 0) {
          // For now, atlas parameters are empty - they could be added later for atlas-wide defaults
          const atlasParams = {}

          // Initialize parameters through the registry with validation
          const validationErrors = parameterStore.initializeFromPreset(
            atlasParams as any,
            updates.territoryParameters as any,
          )

          // Handle validation errors
          if (validationErrors.length > 0) {
            console.warn('[ConfigStore] Parameter validation errors during preset initialization:', validationErrors)
          // Could add user notification here in the future
          }
        }

        // Store original preset defaults for reset functionality
        presetDefaults.storePresetDefaults({
          projections: updates.projections,
          translations: updates.translations,
          scales: updates.scales,
        }, updates.territoryParameters)

        // Apply other updates
        selectedProjection.value = updates.selectedProjection
        if (updates.compositeProjection) {
          compositeProjection.value = updates.compositeProjection
        }
        if (updates.referenceScale !== undefined) {
          referenceScale.value = updates.referenceScale
        }
        if (updates.canvasDimensions !== undefined) {
          canvasDimensions.value = updates.canvasDimensions
        }

        // Update UI store
        uiStore.initializeDisplayOptions({
          showGraticule: updates.mapDisplay.showGraticule,
          showSphere: updates.mapDisplay.showSphere,
          showCompositionBorders: updates.mapDisplay.showCompositionBorders,
          showMapLimits: updates.mapDisplay.showMapLimits,
        })
      }
      catch (error) {
        console.warn('[ConfigStore] Failed to load preset metadata:', error)
        throw error // Re-throw to propagate to awaiting code
      }
    })()

    return initializationPromise
  }

  // Initialize with preset metadata
  initializeWithPresetMetadata()

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

  const setProjectionFittingMode = (mode: 'auto' | 'manual') => {
    projectionFittingMode.value = mode
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
      const presets = await PresetLoader.listPresets({
        atlasId: selectedAtlas.value,
        viewMode: viewMode.value as any,
      })
      // CRITICAL: Filter out composite-custom presets - they use atlas initialization path only
      // Composite-custom presets are loaded via AtlasCoordinator.handleAtlasChange(), not view preset API
      availableViewPresets.value = presets.filter(p => p.type !== 'composite-custom') as any

      console.info(`[ConfigStore] Loaded ${presets.filter(p => p.type !== 'composite-custom').length} view presets for ${selectedAtlas.value} ${viewMode.value}`)
    }
    catch (error) {
      console.error('[ConfigStore] Failed to load available view presets:', error)
      availableViewPresets.value = []
    }
  }

  /**
   * Auto-load first available preset if any exist
   */
  async function autoLoadFirstPreset(context: string) {
    if (availableViewPresets.value.length === 0) {
      console.info(`[ConfigStore] No view presets available to auto-load (${context})`)
      return
    }

    const firstPreset = availableViewPresets.value[0]
    if (!firstPreset) {
      return
    }

    try {
      await loadViewPreset(firstPreset.id)
      console.info(`[ConfigStore] Auto-loaded view preset "${firstPreset.name}" (${context})`)
    }
    catch (error) {
      console.warn(`[ConfigStore] Failed to auto-load preset (${context}):`, error)
    }
  }

  /**
   * Load and apply a view preset
   */
  async function loadViewPreset(presetId: string) {
    try {
      const result = await PresetLoader.loadPreset(presetId)

      if (!result.success || !result.data) {
        console.error('[ConfigStore] Failed to load view preset:', result.errors)
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
        console.warn('[ConfigStore] View preset warnings:', result.warnings)
      }

      console.info('[ConfigStore] View preset loaded successfully:', presetId)
    }
    catch (error) {
      console.error('[ConfigStore] Error loading view preset:', error)
      throw error
    }
  }

  /**
   * Apply view preset configuration to stores
   * Delegates to PresetApplicationService for unified preset application logic
   */
  function applyViewPresetConfig(preset: Preset) {
    const result = PresetApplicationService.applyPreset(preset)

    if (!result.success) {
      console.error('[ConfigStore] Failed to apply preset:', result.errors)
      throw new Error(result.errors.join(', '))
    }

    if (result.warnings.length > 0) {
      console.warn('[ConfigStore] Preset applied with warnings:', result.warnings)
    }
  }

  /**
   * Clear current view preset
   */
  function clearViewPreset() {
    currentViewPreset.value = null
  }

  // Watch view mode changes to load available presets
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

    // Auto-load first preset if available
    await autoLoadFirstPreset(`view mode changed from ${oldMode} to ${newMode}`)
  })

  // Watch atlas changes - use InitializationService for orchestration
  watch(selectedAtlas, async (newAtlasId, oldAtlasId) => {
    // Preload the new atlas before orchestration to ensure sync access works
    await loadAtlasAsync(newAtlasId)

    // Use InitializationService for consistent atlas change handling
    const result = await InitializationService.initializeAtlas({
      atlasId: newAtlasId,
      preserveViewMode: true, // Try to keep current view mode if supported by new atlas
    })

    if (!result.success) {
      console.error('[ConfigStore] Atlas change failed:', result.errors)
      return
    }

    if (!result.state) {
      console.error('[ConfigStore] Atlas change returned no state')
      return
    }

    console.info('[ConfigStore] Atlas changed successfully:', {
      oldAtlas: oldAtlasId,
      newAtlas: newAtlasId,
      newViewMode: result.state.viewMode,
      territoryCount: Object.keys(result.state.parameters.territories).length,
    })

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
    projectionFittingMode,

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
    setCustomRotate,
    setCustomCenter,
    setCustomParallels,
    setCustomScale,
    setProjectionFittingMode,
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
    initializeWithPresetMetadata,
    // View preset actions
    loadAvailableViewPresets,
    loadViewPreset,
    clearViewPreset,
  }
})
