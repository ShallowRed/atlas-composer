import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { PROJECTION_OPTIONS } from '@/services/GeoProjectionService'

export type TerritoryMode = 'metropole-only' | 'metropole-major' | 'metropole-uncommon' | 'all-territories'
export type ViewMode = 'split' | 'composite-existing' | 'composite-custom'
export type ProjectionMode = 'uniform' | 'individual'

export const useConfigStore = defineStore('config', () => {
  // State
  const scalePreservation = ref(true)
  const selectedProjection = ref('albers')
  const territoryMode = ref<TerritoryMode>('metropole-major')
  const viewMode = ref<ViewMode>('split')
  const projectionMode = ref<ProjectionMode>('uniform')
  const compositeProjection = ref<'albers-france' | 'conic-conformal-france'>('albers-france')
  const theme = ref('light')
  
  // Per-territory projections (for individual mode)
  const territoryProjections = ref<Record<string, string>>({
    'FR-GF': 'albers', // Guyane
    'FR-RE': 'albers', // Réunion
    'FR-GP': 'albers', // Guadeloupe
    'FR-MQ': 'albers', // Martinique
    'FR-YT': 'albers', // Mayotte
    'FR-MF': 'albers', // Saint-Martin
    'FR-PF': 'albers', // Polynésie française
    'FR-NC': 'albers', // Nouvelle-Calédonie
    'FR-TF': 'albers', // Terres australes
    'FR-WF': 'albers', // Wallis-et-Futuna
    'FR-PM': 'albers', // Saint-Pierre-et-Miquelon
  })

  // Territory translations (x, y offsets for DOM-TOM positioning)
  const territoryTranslations = ref<Record<string, { x: number, y: number }>>({
    'FR-GF': { x: -8, y: -2 }, // Guyane
    'FR-RE': { x: -10, y: 3 }, // Réunion
    'FR-GP': { x: -8, y: 1 }, // Guadeloupe
    'FR-MQ': { x: -8.5, y: 2.5 }, // Martinique
    'FR-YT': { x: -2, y: -5 }, // Mayotte
    'FR-MF': { x: 0, y: 0 }, // Saint-Martin
    'FR-PF': { x: 0, y: 0 }, // Polynésie française
    'FR-NC': { x: 0, y: 0 }, // Nouvelle-Calédonie
    'FR-TF': { x: 0, y: 0 }, // Terres australes
    'FR-WF': { x: 0, y: 0 }, // Wallis-et-Futuna
    'FR-PM': { x: 0, y: 0 }, // Saint-Pierre-et-Miquelon
  })

  // Territory scales (scale multipliers for DOM-TOM sizing)
  const territoryScales = ref<Record<string, number>>({
    'FR-GF': 1.0, // Guyane
    'FR-RE': 1.0, // Réunion
    'FR-GP': 1.0, // Guadeloupe
    'FR-MQ': 1.0, // Martinique
    'FR-YT': 1.0, // Mayotte
    'FR-MF': 1.0, // Saint-Martin
    'FR-PF': 1.0, // Polynésie française
    'FR-NC': 1.0, // Nouvelle-Calédonie
    'FR-TF': 1.0, // Terres australes
    'FR-WF': 1.0, // Wallis-et-Futuna
    'FR-PM': 1.0, // Saint-Pierre-et-Miquelon
  })

  // Computed
  const showProjectionSelector = computed(() => {
    // Show uniform projection selector when:
    // - In split mode with uniform projection
    // - OR in custom composite mode (always uses one projection)
    if (viewMode.value === 'composite-custom') {
      return true // Custom composite always uses one projection
    }
    return viewMode.value === 'split' && projectionMode.value === 'uniform'
  })

  const showProjectionModeToggle = computed(() => {
    // Show projection mode toggle (uniform/individual) only for split mode
    // Custom composite always uses uniform projection since territories are repositioned
    return viewMode.value === 'split'
  })

  const showIndividualProjectionSelectors = computed(() => {
    // Show per-territory projection selectors only in split mode with individual projection
    // Not available for composite modes since they require a unified projection
    return viewMode.value === 'split' && projectionMode.value === 'individual'
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
    const compositeProjections = ['albers-france', 'conic-conformal-france']
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

  const setTerritoryMode = (mode: TerritoryMode) => {
    territoryMode.value = mode
  }

  const setViewMode = (mode: ViewMode) => {
    viewMode.value = mode
  }

  const setProjectionMode = (mode: ProjectionMode) => {
    projectionMode.value = mode
  }

  const setCompositeProjection = (projection: 'albers-france' | 'conic-conformal-france') => {
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

    console.log(`Theme changed to: ${newTheme}`)
  }

  const initializeTheme = () => {
    const savedTheme = localStorage.getItem('daisyui-theme') || 'light'
    setTheme(savedTheme)
  }

  const getCartographerSettings = () => ({
    scalePreservation: scalePreservation.value,
    selectedProjection: selectedProjection.value,
    territoryMode: territoryMode.value,
    viewMode: viewMode.value,
    territoryTranslations: territoryTranslations.value,
    territoryScales: territoryScales.value,
  })

  return {
    // State
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
    getCartographerSettings,
  }
})
