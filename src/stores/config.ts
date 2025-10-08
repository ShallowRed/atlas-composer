import { defineStore } from 'pinia'

import { computed, ref, watch } from 'vue'
import { DEFAULT_ATLAS, getAllAtlases, getAtlasConfig } from '@/core/atlases/registry'
import { calculateDefaultProjections, calculateDefaultScales, createDefaultTranslations } from '@/core/atlases/utils'
import { AtlasService } from '@/services/atlas-service'
import { PROJECTION_OPTIONS } from '@/services/projection-service'

export type ViewMode = 'split' | 'composite-existing' | 'composite-custom' | 'unified'
export type ProjectionMode = 'uniform' | 'individual'

export const useConfigStore = defineStore('config', () => {
  // State
  const selectedAtlas = ref(DEFAULT_ATLAS)
  const scalePreservation = ref(true)

  // Initialize selectedProjection from the default atlas's mainland projection type
  const getInitialProjection = () => {
    const atlasService = new AtlasService(DEFAULT_ATLAS)
    const mainland = atlasService.getMainland()
    return mainland?.projectionType || 'albers'
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
    return 'metropole-major' // Fallback for backward compatibility
  }
  const territoryMode = ref<string>(getInitialTerritoryMode())

  const viewMode = ref<ViewMode>('composite-custom')
  // Default to 'individual' since default viewMode is 'composite-custom'
  const projectionMode = ref<ProjectionMode>('individual')
  const compositeProjection = ref<string>(currentAtlasConfig.value.defaultCompositeProjection || 'conic-conformal-france')
  const theme = ref('light')

  // Computed: Check if view mode selector should be disabled
  const isViewModeLocked = computed(() => {
    const config = currentAtlasConfig.value
    return config.supportedViewModes.length === 1
  })

  // Per-territory projections (for individual mode)
  // Initialize from current region's territories
  const initializeTerritoryProjections = () => {
    const overseas = atlasService.value.getOverseasTerritories()
    return calculateDefaultProjections(overseas, 'mercator')
  }
  const territoryProjections = ref<Record<string, string>>(initializeTerritoryProjections())

  // Territory translations (x, y offsets in pixels relative to mainland center)
  // Initialize from current region's territories
  // Positive X = right, Negative X = left
  // Positive Y = down, Negative Y = up
  const initializeTerritoryTranslations = () => {
    const all = atlasService.value.getAllTerritories()
    return createDefaultTranslations(all)
  }
  const territoryTranslations = ref<Record<string, { x: number, y: number }>>(initializeTerritoryTranslations())

  // Territory scales (scale multipliers for territoires ultramarins sizing)
  // Initialize from current region's territories - all start with default 1.0 multiplier
  const initializeTerritoryScales = () => {
    const all = atlasService.value.getAllTerritories()
    return calculateDefaultScales(all)
  }
  const territoryScales = ref<Record<string, number>>(initializeTerritoryScales())

  // Computed
  const showProjectionSelector = computed(() => {
    // Show uniform projection selector when:
    // - In unified mode (single projection for all territories)
    if (viewMode.value === 'unified') {
      return true
    }
    // - In split or custom composite mode with uniform projection
    if (viewMode.value === 'split' || viewMode.value === 'composite-custom') {
      return projectionMode.value === 'uniform'
    }
    return false
  })

  const showProjectionModeToggle = computed(() => {
    // Show projection mode toggle (uniform/individual) for split and custom composite modes
    // Split: Can switch between uniform and individual projections per territory
    // Custom composite: Can use individual projections with D3 composite projection pattern
    // Existing composite: Uses predefined projections (no toggle)
    return viewMode.value === 'split' || viewMode.value === 'composite-custom'
  })

  const showIndividualProjectionSelectors = computed(() => {
    // Show per-territory projection selectors in individual mode
    // Split: Renders each territory separately with its own projection
    // Custom composite: Uses D3 composite projection with sub-projections per territory
    return (viewMode.value === 'split' || viewMode.value === 'composite-custom')
      && projectionMode.value === 'individual'
  })

  const showTerritorySelector = computed(() => {
    // Show territory selector in all modes
    return true
  })

  const showScalePreservation = computed(() => {
    // Show scale preservation only in split view mode
    return viewMode.value === 'split'
  })

  const showTerritoryControls = computed(() => {
    // Show territory translation/scale controls in custom composite mode
    return viewMode.value === 'composite-custom'
  })

  const showCompositeProjectionSelector = computed(() => {
    // Show composite projection selector when using existing composite projections
    return viewMode.value === 'composite-existing'
  })

  const projectionGroups = computed(() => {
    const groups: { [key: string]: any[] } = {}

    // Exclude all composite projections from the projection selector
    // They are now handled by the composite mode selector
    // Dynamically get all composite projections from all regions
    const allCompositeProjections = Object.values(getAllAtlases())
      .flatMap(config => config.compositeProjections || [])

    const filteredOptions = PROJECTION_OPTIONS.filter(option => !allCompositeProjections.includes(option.value))

    filteredOptions.forEach((option) => {
      if (!groups[option.category]) {
        groups[option.category] = []
      }
      groups[option.category]!.push(option)
    })

    return Object.keys(groups).map(category => ({
      category,
      options: groups[category],
    }))
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

  // Watch for region changes and enforce view mode restrictions
  watch(selectedAtlas, (newRegion) => {
    const config = getAtlasConfig(newRegion)

    // If the current view mode is not supported by the new region, switch to default
    if (!config.supportedViewModes.includes(viewMode.value)) {
      viewMode.value = config.defaultViewMode
    }

    // Update territory mode for the new region
    if (config.hasTerritorySelector) {
      // Use configured default territory mode if available
      if (config.defaultTerritoryMode) {
        territoryMode.value = config.defaultTerritoryMode
      }
      // Otherwise use first option from territoryModeOptions
      else if (config.territoryModeOptions && config.territoryModeOptions.length > 0) {
        territoryMode.value = config.territoryModeOptions[0]!.value as any
      }
    }

    // Reinitialize territory configurations for the new region
    territoryProjections.value = initializeTerritoryProjections()
    territoryTranslations.value = initializeTerritoryTranslations()
    territoryScales.value = initializeTerritoryScales()

    // Load default composite configuration if available (overrides calculated defaults)
    if (config.defaultCompositeConfig) {
      Object.assign(territoryProjections.value, config.defaultCompositeConfig.territoryProjections)
      Object.assign(territoryTranslations.value, config.defaultCompositeConfig.territoryTranslations)
      Object.assign(territoryScales.value, config.defaultCompositeConfig.territoryScales)
    }

    // Update composite projection to match the new region
    if (config.defaultCompositeProjection) {
      compositeProjection.value = config.defaultCompositeProjection
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
