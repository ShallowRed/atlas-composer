import { defineStore } from 'pinia'

import { computed, ref, watch } from 'vue'
import { ALL_TERRITORIES, OVERSEAS_TERRITORIES } from '@/constants/france-territories'
import { DEFAULT_REGION, getRegionConfig } from '@/constants/regions'
import { DEFAULT_PROJECTION_TYPES } from '@/constants/territory-types'
import { PROJECTION_OPTIONS } from '@/services/GeoProjectionService'

export type ViewMode = 'split' | 'composite-existing' | 'composite-custom' | 'unified'
export type ProjectionMode = 'uniform' | 'individual'

export const useConfigStore = defineStore('config', () => {
  // State
  const selectedRegion = ref(DEFAULT_REGION)
  const scalePreservation = ref(true)
  const selectedProjection = ref('albers')

  // Computed: Current region configuration (needs to be before territoryMode)
  const currentRegionConfig = computed(() => getRegionConfig(selectedRegion.value))

  // Territory mode - initialize with the default from the current region's config
  const getInitialTerritoryMode = () => {
    const config = getRegionConfig(DEFAULT_REGION)
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
  const compositeProjection = ref<string>(currentRegionConfig.value.defaultCompositeProjection || 'conic-conformal-france')
  const theme = ref('light')

  // Computed: Check if view mode selector should be disabled
  const isViewModeLocked = computed(() => {
    const config = currentRegionConfig.value
    return config.supportedViewModes.length === 1
  })

  // Per-territory projections (for individual mode)
  // Initialize from centralized territory configuration
  const territoryProjections = ref<Record<string, string>>(
    Object.fromEntries(
      OVERSEAS_TERRITORIES.map(t => [
        t.code,
        t.projectionType || DEFAULT_PROJECTION_TYPES.OVERSEAS,
      ]),
    ),
  )

  // Territory translations (x, y offsets in pixels relative to mainland center)
  // Initialize from centralized territory configuration
  // Positive X = right, Negative X = left
  // Positive Y = down, Negative Y = up
  const territoryTranslations = ref<Record<string, { x: number, y: number }>>(
    Object.fromEntries(
      ALL_TERRITORIES.map(t => [t.code, { x: t.offset[0], y: t.offset[1] }]),
    ),
  )

  // Territory scales (scale multipliers for DOM-TOM sizing)
  // All territories start with default 1.0 multiplier
  const territoryScales = ref<Record<string, number>>(
    Object.fromEntries(
      ALL_TERRITORIES.map(t => [t.code, 1.0]),
    ),
  )

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

    // Exclude composite projections from the projection selector
    // They are now handled by the composite mode selector
    const compositeProjections = ['conic-conformal-france', 'conic-conformal-portugal']
    const filteredOptions = PROJECTION_OPTIONS.filter(option => !compositeProjections.includes(option.value))

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
  watch(selectedRegion, (newRegion) => {
    const config = getRegionConfig(newRegion)

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

    // Load default composite configuration if available
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
    selectedRegion,
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
    currentRegionConfig,
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
