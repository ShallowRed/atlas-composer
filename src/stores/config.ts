import type { ViewMode } from '@/types'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { getSharedPresetDefaults } from '@/composables/usePresetDefaults'
import { DEFAULT_ATLAS, getAtlasConfig } from '@/core/atlases/registry'
import { AtlasCoordinator } from '@/services/atlas/atlas-coordinator'
import { AtlasService } from '@/services/atlas/atlas-service'
import { ProjectionUIService } from '@/services/projection/projection-ui-service'
import { useParameterStore } from '@/stores/parameters'
import { useUIStore } from '@/stores/ui'

export type ProjectionMode = 'uniform' | 'individual'

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
    const atlasService = new AtlasService(DEFAULT_ATLAS)
    const mainland = atlasService.getMainland()
    return mainland?.projectionType || 'natural-earth'
  }
  const selectedProjection = ref(getInitialProjection())

  // Computed: Current atlas configuration (needs to be before territoryMode)
  const currentAtlasConfig = computed(() => getAtlasConfig(selectedAtlas.value))

  // Computed: Atlas service for accessing atlas-specific data
  const atlasService = computed(() => new AtlasService(selectedAtlas.value))

  // Territory mode - initialize with the default from the current atlas's config
  const getInitialTerritoryMode = () => {
    const config = getAtlasConfig(DEFAULT_ATLAS)
    // Use configured default territory mode if available
    if (config.defaultTerritoryMode) {
      return config.defaultTerritoryMode
    }
    // Otherwise use first option from territoryModeOptions
    if (config.hasTerritorySelector && config.territoryModeOptions && config.territoryModeOptions.length > 0) {
      return config.territoryModeOptions[0]!.value
    }
    throw new Error('No territory mode options available for the default atlas')
  }
  const territoryMode = ref<string>(getInitialTerritoryMode())

  const viewMode = ref<ViewMode>(currentAtlasConfig.value.defaultViewMode)
  // Default to 'individual' since default viewMode is 'composite-custom'
  const projectionMode = ref<ProjectionMode>('individual')
  // Initialize with fallback, will be updated async with preset data
  const compositeProjection = ref<string>('conic-conformal-france')
  // Reference scale from preset, will be updated async with preset data
  const referenceScale = ref<number | undefined>(undefined)
  // Canvas dimensions from preset, will be updated async with preset data (defaults to 960×500)
  const canvasDimensions = ref<{ width: number, height: number } | undefined>(undefined)

  // Computed: Check if view mode selector should be disabled
  const isViewModeLocked = computed(() => {
    const config = currentAtlasConfig.value
    return config.supportedViewModes.length === 1
  })

  // Initialize UI store with fallback defaults - will be updated async with preset data
  uiStore.initializeDisplayOptions({
    showGraticule: false,
    showSphere: false,
    showCompositionBorders: true,
    showMapLimits: true,
  })

  // Initialize territory defaults in the parameter store
  const initializeTerritoryDefaults = () => {
    const all = atlasService.value.getAllTerritories()
    // Initialize default projection IDs and translations for all territories
    for (const territory of all) {
      // Set default projection ID if not already set (will be overridden by preset)
      const currentProjection = parameterStore.getTerritoryProjection(territory.code)
      if (!currentProjection) {
        parameterStore.setTerritoryProjection(territory.code, 'mercator')
      }
      // Ensure translateOffset is initialized
      const effective = parameterStore.getEffectiveParameters(territory.code)
      if (!effective.translateOffset) {
        parameterStore.setTerritoryParameter(territory.code, 'translateOffset', [0, 0])
      }
    }
  }

  // Call initialization
  initializeTerritoryDefaults()

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

        Object.entries(updates.projections).forEach(([code, projection]) => {
          parameterStore.setTerritoryProjection(code, projection)
        })
        Object.entries(updates.translations).forEach(([code, translation]) => {
          parameterStore.setTerritoryTranslation(code, 'x', translation.x)
          parameterStore.setTerritoryTranslation(code, 'y', translation.y)
        })
        Object.entries(updates.scales).forEach(([code, scale]) => {
          parameterStore.setTerritoryParameter(code, 'scaleMultiplier', scale)
        })

        // Store original preset defaults for reset functionality
        presetDefaults.storePresetDefaults({
          projections: updates.projections,
          translations: updates.translations,
          scales: updates.scales,
        }, updates.territoryParameters)

        // Load projection parameters into parameter store using registry validation
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
    ProjectionUIService.shouldShowProjectionSelector(viewMode.value, projectionMode.value),
  )

  const showProjectionModeToggle = computed(() =>
    ProjectionUIService.shouldShowProjectionModeToggle(viewMode.value),
  )

  const showIndividualProjectionSelectors = computed(() =>
    ProjectionUIService.shouldShowIndividualProjectionSelectors(viewMode.value, projectionMode.value),
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

  const showCompositeProjectionSelector = computed(() =>
    ProjectionUIService.shouldShowCompositeProjectionSelector(viewMode.value),
  )

  const projectionGroups = computed(() =>
    ProjectionUIService.getProjectionGroups(selectedAtlas.value, viewMode.value),
  )

  const projectionRecommendations = computed(() =>
    ProjectionUIService.getProjectionRecommendations(selectedAtlas.value, viewMode.value),
  )

  // Compute effective projection params by merging atlas defaults with global parameter overrides
  const effectiveProjectionParams = computed(() => {
    const atlasParams = atlasService.value?.getProjectionParams()
    const globalParams = parameterStore.globalParameters

    // Extract individual parameter values with proper fallbacks
    const centerLon = globalParams.center?.[0] ?? atlasParams?.center?.[0] ?? 0
    const centerLat = globalParams.center?.[1] ?? atlasParams?.center?.[1] ?? 0

    const rotateLon = globalParams.rotate?.[0] ?? 0
    const rotateLat = globalParams.rotate?.[1] ?? 0

    const parallel1 = globalParams.parallels?.[0] ?? atlasParams?.parallels?.[0] ?? 30
    const parallel2 = globalParams.parallels?.[1] ?? atlasParams?.parallels?.[1] ?? 60

    // Build result with ProjectionParameters-compatible structure
    return {
      center: [centerLon, centerLat] as [number, number],
      rotate: [rotateLon, rotateLat] as [number, number],
      parallels: [parallel1, parallel2] as [number, number],
      scale: globalParams.scale ?? undefined,
    } as ProjectionParameters
  })

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
    // Auto-adjust projection mode for composite-custom
    // In composite-custom, individual projections make the most sense
    if (mode === 'composite-custom' && projectionMode.value === 'uniform') {
      projectionMode.value = 'individual'
    }
  }

  const setProjectionMode = (mode: ProjectionMode) => {
    projectionMode.value = mode
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
    // Reset all global parameter overrides by setting to undefined
    parameterStore.setGlobalParameter('rotate', undefined)
    parameterStore.setGlobalParameter('center', undefined)
    parameterStore.setGlobalParameter('parallels', undefined)
    parameterStore.setGlobalParameter('scale', undefined)
    rotateLatitudeLocked.value = true // Reset to locked state
  }

  // Individual parameter setters for backward compatibility
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

  // Watch for atlas changes - use AtlasCoordinator for complex orchestration
  watch(selectedAtlas, async (newAtlasId) => {
    const updates = await AtlasCoordinator.handleAtlasChange(newAtlasId, viewMode.value)

    // Apply all updates from coordinator to config store
    viewMode.value = updates.viewMode
    territoryMode.value = updates.territoryMode
    selectedProjection.value = updates.selectedProjection

    // Store original preset defaults for reset functionality
    presetDefaults.storePresetDefaults({
      projections: updates.projections,
      translations: updates.translations,
      scales: updates.scales,
    }, updates.territoryParameters)

    // Update parameter store - use proper setter methods to maintain reactivity
    Object.entries(updates.projections).forEach(([code, projection]) => {
      parameterStore.setTerritoryProjection(code, projection)
    })
    Object.entries(updates.translations).forEach(([code, translation]) => {
      parameterStore.setTerritoryTranslation(code, 'x', translation.x)
      parameterStore.setTerritoryTranslation(code, 'y', translation.y)
    })
    Object.entries(updates.scales).forEach(([code, scale]) => {
      parameterStore.setTerritoryParameter(code, 'scaleMultiplier', scale)
    })

    // Load territory-specific projection parameters into parameter store
    if (updates.territoryParameters && Object.keys(updates.territoryParameters).length > 0) {
      Object.entries(updates.territoryParameters).forEach(([territoryCode, params]) => {
        parameterStore.setTerritoryParameters(territoryCode, params as any)
      })
    }

    // Update UI store
    uiStore.showGraticule = updates.mapDisplay.showGraticule
    uiStore.showSphere = updates.mapDisplay.showSphere
    uiStore.showCompositionBorders = updates.mapDisplay.showCompositionBorders
    uiStore.showMapLimits = updates.mapDisplay.showMapLimits

    if (updates.compositeProjection) {
      compositeProjection.value = updates.compositeProjection
    }
    if (updates.referenceScale !== undefined) {
      referenceScale.value = updates.referenceScale
    }
    if (updates.canvasDimensions !== undefined) {
      canvasDimensions.value = updates.canvasDimensions
    }
  })

  return {
    // State
    selectedAtlas,
    scalePreservation,
    selectedProjection,
    territoryMode,
    viewMode,
    projectionMode,
    compositeProjection,
    referenceScale,
    canvasDimensions,
    // Legacy parameter accessors - delegate to parameter store for backward compatibility
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
    effectiveProjectionParams,
    isViewModeLocked,
    showProjectionSelector,
    showProjectionModeToggle,
    showIndividualProjectionSelectors,
    showTerritorySelector,
    showScalePreservation,
    showTerritoryControls,
    showCompositeProjectionSelector,
    projectionGroups,
    projectionRecommendations,

    // Actions
    setScalePreservation,
    setSelectedProjection,
    setTerritoryMode,
    setViewMode,
    setProjectionMode,
    setCompositeProjection,
    setCustomRotate,
    setCustomCenter,
    setCustomParallels,
    setCustomScale,
    setProjectionFittingMode,
    setRotateLatitudeLocked,
    resetProjectionParams,
    // Individual parameter setters for backward compatibility
    setCustomRotateLongitude,
    setCustomRotateLatitude,
    setCustomCenterLongitude,
    setCustomCenterLatitude,
    setCustomParallel1,
    setCustomParallel2,
    initializeTheme,
    initializeWithPresetMetadata,
  }
})
