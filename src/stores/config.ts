import type { ViewMode } from '@/types'

import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { DEFAULT_ATLAS, getAtlasConfig, getAtlasSpecificConfig } from '@/core/atlases/registry'
import { AtlasCoordinator } from '@/services/atlas/atlas-coordinator'
import { AtlasService } from '@/services/atlas/atlas-service'
import { TerritoryDefaultsService } from '@/services/atlas/territory-defaults-service'
import { ProjectionUIService } from '@/services/projection/projection-ui-service'

export type ProjectionMode = 'uniform' | 'individual'

export const useConfigStore = defineStore('config', () => {
  // State
  const selectedAtlas = ref(DEFAULT_ATLAS)
  const scalePreservation = ref(true)

  const initialMapDisplay = getAtlasConfig(DEFAULT_ATLAS).mapDisplayDefaults || {}
  const showGraticule = ref(initialMapDisplay.showGraticule ?? false)
  const showSphere = ref(initialMapDisplay.showSphere ?? false)
  const showCompositionBorders = ref(initialMapDisplay.showCompositionBorders ?? false)
  const showMapLimits = ref(initialMapDisplay.showMapLimits ?? false)

  // Initialize selectedProjection from the default atlas's projection preferences or mainland
  const getInitialProjection = () => {
    const specificConfig = getAtlasSpecificConfig(DEFAULT_ATLAS)

    // First, try to get from projection preferences (for wildcard atlases like world)
    const projectionPrefs = specificConfig.projectionPreferences
    if (projectionPrefs?.recommended && projectionPrefs.recommended.length > 0) {
      return projectionPrefs.recommended[0]
    }

    // Otherwise, use mainland territory projection
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
  const compositeProjection = ref<string>(currentAtlasConfig.value.defaultCompositeProjection || 'conic-conformal-france')
  const theme = ref('light')

  // Computed: Check if view mode selector should be disabled
  const isViewModeLocked = computed(() => {
    const config = currentAtlasConfig.value
    return config.supportedViewModes.length === 1
  })

  // Use TerritoryDefaultsService for territory initialization
  const initializeTerritoryDefaults = () => {
    const all = atlasService.value.getAllTerritories()
    return TerritoryDefaultsService.initializeAll(all, 'mercator')
  }

  const initialDefaults = initializeTerritoryDefaults()
  const territoryProjections = ref<Record<string, string>>(initialDefaults.projections)
  const territoryTranslations = ref<Record<string, { x: number, y: number }>>(initialDefaults.translations)
  const territoryScales = ref<Record<string, number>>(initialDefaults.scales)

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

  const setTerritoryProjection = (territoryCode: string, projection: string) => {
    territoryProjections.value[territoryCode] = projection
  }

  const setTerritoryTranslation = (territoryCode: string, axis: 'x' | 'y', value: number) => {
    if (!territoryTranslations.value[territoryCode]) {
      territoryTranslations.value[territoryCode] = { x: 0, y: 0 }
    }
    territoryTranslations.value[territoryCode][axis] = value
  }

  const setTerritoryScale = (territoryCode: string, value: number) => {
    territoryScales.value[territoryCode] = value
  }

  const setTheme = (newTheme: string) => {
    theme.value = newTheme

    // Apply theme to HTML element
    document.documentElement.setAttribute('data-theme', newTheme)

    // Save theme preference to localStorage
    localStorage.setItem('daisyui-theme', newTheme)
  }

  const initializeTheme = () => {
    const savedTheme = localStorage.getItem('daisyui-theme') || 'light'
    setTheme(savedTheme)
  }

  // Watch for atlas changes - use AtlasCoordinator for complex orchestration
  watch(selectedAtlas, (newAtlasId) => {
    const updates = AtlasCoordinator.handleAtlasChange(newAtlasId, viewMode.value)

    // Apply all updates from coordinator
    viewMode.value = updates.viewMode
    territoryMode.value = updates.territoryMode
    territoryProjections.value = updates.projections
    territoryTranslations.value = updates.translations
    territoryScales.value = updates.scales
    selectedProjection.value = updates.selectedProjection
    showGraticule.value = updates.mapDisplay.showGraticule
    showSphere.value = updates.mapDisplay.showSphere
    showCompositionBorders.value = updates.mapDisplay.showCompositionBorders
    showMapLimits.value = updates.mapDisplay.showMapLimits

    if (updates.compositeProjection) {
      compositeProjection.value = updates.compositeProjection
    }
  })

  return {
    // State
    selectedAtlas,
    scalePreservation,
    showGraticule,
    showSphere,
    showCompositionBorders,
    showMapLimits,
    selectedProjection,
    territoryMode,
    viewMode,
    projectionMode,
    compositeProjection,
    territoryProjections,
    theme,
    territoryTranslations,
    territoryScales,

    // Computed
    atlasService,
    currentAtlasConfig,
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
    setTerritoryProjection,
    setTheme,
    setTerritoryTranslation,
    setTerritoryScale,
    initializeTheme,
  }
})
