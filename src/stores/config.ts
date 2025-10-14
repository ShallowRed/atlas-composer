import type { ViewMode } from '@/types'

import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { DEFAULT_ATLAS, getAtlasConfig } from '@/core/atlases/registry'
import { AtlasCoordinator } from '@/services/atlas/atlas-coordinator'
import { AtlasService } from '@/services/atlas/atlas-service'
import { AtlasMetadataService } from '@/services/presets/atlas-metadata-service'
import { ProjectionUIService } from '@/services/projection/projection-ui-service'
import { useTerritoryStore } from '@/stores/territory'
import { useUIStore } from '@/stores/ui'

export type ProjectionMode = 'uniform' | 'individual'

export const useConfigStore = defineStore('config', () => {
  // Initialize new stores for UI and territory state
  const uiStore = useUIStore()
  const territoryStore = useTerritoryStore()

  // State
  const selectedAtlas = ref(DEFAULT_ATLAS)
  const scalePreservation = ref(true)

  // Projection parameters - custom overrides (null = use atlas defaults)
  const customRotateLongitude = ref<number | null>(null)
  const customRotateLatitude = ref<number | null>(null)
  const customCenterLongitude = ref<number | null>(null)
  const customCenterLatitude = ref<number | null>(null)
  const customParallel1 = ref<number | null>(null)
  const customParallel2 = ref<number | null>(null)
  const customScale = ref<number | null>(null)

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

  // Computed: Check if view mode selector should be disabled
  const isViewModeLocked = computed(() => {
    const config = currentAtlasConfig.value
    return config.supportedViewModes.length === 1
  })

  // Initialize UI store with fallback defaults - will be updated async with preset data
  uiStore.initializeDisplayOptions({
    showGraticule: false,
    showSphere: false,
    showCompositionBorders: false,
    showMapLimits: false,
  })

  // Initialize territory defaults in the territory store
  const initializeTerritoryDefaults = () => {
    const all = atlasService.value.getAllTerritories()
    territoryStore.initializeDefaults(all, 'mercator')
  }

  // Call initialization
  initializeTerritoryDefaults()

  // Async initialization to load metadata from presets
  const initializeWithPresetMetadata = async () => {
    try {
      const currentAtlasId = selectedAtlas.value
      const currentPreset = currentAtlasConfig.value.defaultPreset

      // Load projection preferences to update selectedProjection
      const projectionPrefs = await AtlasMetadataService.getProjectionPreferences(currentAtlasId, currentPreset)
      if (projectionPrefs?.recommended && projectionPrefs.recommended.length > 0) {
        selectedProjection.value = projectionPrefs.recommended[0]!
      }

      // Load default composite projection
      const atlasMetadata = await AtlasMetadataService.getAtlasMetadata(currentAtlasId, currentPreset)
      if (atlasMetadata.metadata?.defaultCompositeProjection) {
        compositeProjection.value = atlasMetadata.metadata.defaultCompositeProjection
      }

      // Load map display defaults
      const mapDisplayDefaults = await AtlasMetadataService.getMapDisplayDefaults(currentAtlasId, currentPreset)
      if (mapDisplayDefaults) {
        uiStore.initializeDisplayOptions({
          showGraticule: mapDisplayDefaults.showGraticule ?? false,
          showSphere: mapDisplayDefaults.showSphere ?? false,
          showCompositionBorders: mapDisplayDefaults.showCompositionBorders ?? false,
          showMapLimits: mapDisplayDefaults.showMapLimits ?? false,
        })
      }
    }
    catch (error) {
      console.warn('[ConfigStore] Failed to load preset metadata:', error)
    }
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

  // Compute effective projection params (custom overrides or atlas defaults)
  const effectiveProjectionParams = computed(() => {
    const atlasParams = atlasService.value?.getProjectionParams()

    // Provide sensible defaults if atlas params are not available
    const defaultParams = {
      center: { longitude: 0, latitude: 0 },
      rotate: {
        mainland: [0, 0] as [number, number],
        azimuthal: [0, 0] as [number, number],
      },
      parallels: { conic: [30, 60] as [number, number] },
    }

    if (!atlasParams) {
      // Even without atlas params, apply custom overrides
      const result = {
        center: {
          longitude: customCenterLongitude.value ?? defaultParams.center.longitude,
          latitude: customCenterLatitude.value ?? defaultParams.center.latitude,
        },
        rotate: {
          mainland: [
            customRotateLongitude.value ?? defaultParams.rotate.mainland[0],
            customRotateLatitude.value ?? defaultParams.rotate.mainland[1],
          ] as [number, number],
          azimuthal: [
            customRotateLongitude.value ?? defaultParams.rotate.azimuthal[0],
            customRotateLatitude.value ?? defaultParams.rotate.azimuthal[1],
          ] as [number, number],
        },
        parallels: {
          conic: [
            customParallel1.value ?? defaultParams.parallels.conic[0],
            customParallel2.value ?? defaultParams.parallels.conic[1],
          ] as [number, number],
        },
      }
      return result
    }

    // Extract mainland rotate values safely
    const mainlandRotate = Array.isArray(atlasParams.rotate?.mainland)
      ? atlasParams.rotate.mainland
      : typeof atlasParams.rotate?.mainland === 'number'
        ? [atlasParams.rotate.mainland, 0]
        : [0, 0]

    // Extract azimuthal rotate values safely
    const azimuthalRotate = Array.isArray(atlasParams.rotate?.azimuthal)
      ? atlasParams.rotate.azimuthal
      : [0, 0]

    const result = {
      center: {
        longitude: customCenterLongitude.value ?? atlasParams.center?.longitude ?? 0,
        latitude: customCenterLatitude.value ?? atlasParams.center?.latitude ?? 0,
      },
      rotate: {
        mainland: [
          customRotateLongitude.value ?? mainlandRotate[0],
          customRotateLatitude.value ?? mainlandRotate[1],
        ] as [number, number],
        azimuthal: [
          customRotateLongitude.value ?? azimuthalRotate[0],
          customRotateLatitude.value ?? azimuthalRotate[1],
        ] as [number, number],
      },
      parallels: {
        conic: [
          customParallel1.value ?? atlasParams.parallels?.conic?.[0] ?? 30,
          customParallel2.value ?? atlasParams.parallels?.conic?.[1] ?? 60,
        ] as [number, number],
      },
      scale: customScale.value ?? undefined,
    }

    return result
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
    customRotateLongitude.value = longitude
    customRotateLatitude.value = latitude
  }

  const setCustomCenter = (longitude: number | null, latitude: number | null) => {
    customCenterLongitude.value = longitude
    customCenterLatitude.value = latitude
  }

  const setCustomParallels = (parallel1: number | null, parallel2: number | null) => {
    customParallel1.value = parallel1
    customParallel2.value = parallel2
  }

  const setCustomScale = (scale: number | null) => {
    customScale.value = scale
  }

  const setProjectionFittingMode = (mode: 'auto' | 'manual') => {
    projectionFittingMode.value = mode
  }

  const setRotateLatitudeLocked = (locked: boolean) => {
    rotateLatitudeLocked.value = locked
  }

  const resetProjectionParams = () => {
    customRotateLongitude.value = null
    customRotateLatitude.value = null
    customCenterLongitude.value = null
    customCenterLatitude.value = null
    customParallel1.value = null
    customParallel2.value = null
    customScale.value = null
    rotateLatitudeLocked.value = true // Reset to locked state
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

    // Update territory store
    territoryStore.territoryProjections = updates.projections
    territoryStore.territoryTranslations = updates.translations
    territoryStore.territoryScales = updates.scales

    // Update UI store
    uiStore.showGraticule = updates.mapDisplay.showGraticule
    uiStore.showSphere = updates.mapDisplay.showSphere
    uiStore.showCompositionBorders = updates.mapDisplay.showCompositionBorders
    uiStore.showMapLimits = updates.mapDisplay.showMapLimits

    if (updates.compositeProjection) {
      compositeProjection.value = updates.compositeProjection
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
    customRotateLongitude,
    customRotateLatitude,
    customCenterLongitude,
    customCenterLatitude,
    customParallel1,
    customParallel2,
    customScale,
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
    initializeTheme,
  }
})
