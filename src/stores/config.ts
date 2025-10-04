import { defineStore } from 'pinia'
import { computed, ref, triggerRef } from 'vue'
import { PROJECTION_OPTIONS } from '@/services/GeoProjectionService'

export type TerritoryMode = 'metropole-only' | 'metropole-major' | 'metropole-uncommon' | 'all-territories'
export type ViewMode = 'split' | 'composite-existing' | 'composite-custom'
export type ProjectionMode = 'uniform' | 'individual'

export const useConfigStore = defineStore('config', () => {
  // State
  const scalePreservation = ref(true)
  const selectedProjection = ref('albers')
  const territoryMode = ref<TerritoryMode>('metropole-major')
  const viewMode = ref<ViewMode>('composite-custom')
  // Default to 'individual' since default viewMode is 'composite-custom'
  const projectionMode = ref<ProjectionMode>('individual')
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

  // Territory translations (x, y offsets in pixels relative to mainland center)
  // Positive X = right, Negative X = left
  // Positive Y = down, Negative Y = up
  const territoryTranslations = ref<Record<string, { x: number, y: number }>>({
    'FR-MET': { x: 0, y: 0 }, // France Métropolitaine - center reference
    'FR-GP': { x: -400, y: 100 }, // Guadeloupe - bottom left
    'FR-MQ': { x: -400, y: 200 }, // Martinique - below Guadeloupe
    'FR-GF': { x: -400, y: 300 }, // Guyane - below Martinique
    'FR-RE': { x: 300, y: 100 }, // Réunion - bottom right
    'FR-YT': { x: 350, y: 200 }, // Mayotte - near Réunion
    'FR-NC': { x: 450, y: -100 }, // Nouvelle-Calédonie - top right
    'FR-PF': { x: 450, y: 100 }, // Polynésie - below NC
    'FR-PM': { x: -100, y: -200 }, // Saint-Pierre-et-Miquelon - top left
    'FR-WF': { x: 400, y: 250 }, // Wallis-et-Futuna - between RE and PF
    'FR-MF': { x: -350, y: 80 }, // Saint-Martin - near GP
    'FR-TF': { x: 300, y: 300 }, // TAAF - bottom right corner
  })

  // Territory scales (scale multipliers for DOM-TOM sizing)
  const territoryScales = ref<Record<string, number>>({
    'FR-MET': 1.0, // France Métropolitaine
    'FR-GP': 1.0, // Guadeloupe
    'FR-MQ': 1.0, // Martinique
    'FR-GF': 1.0, // Guyane
    'FR-RE': 1.0, // Réunion
    'FR-YT': 1.0, // Mayotte
    'FR-NC': 1.0, // Nouvelle-Calédonie
    'FR-PF': 1.0, // Polynésie française
    'FR-PM': 1.0, // Saint-Pierre-et-Miquelon
    'FR-WF': 1.0, // Wallis-et-Futuna
    'FR-MF': 1.0, // Saint-Martin
    'FR-TF': 1.0, // Terres australes
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
    // Auto-adjust projection mode for composite-custom
    // In composite-custom, individual projections make the most sense
    if (mode === 'composite-custom' && projectionMode.value === 'uniform') {
      console.log('[config] Auto-switching to individual projection mode for composite-custom')
      projectionMode.value = 'individual'
    }
  }

  const setProjectionMode = (mode: ProjectionMode) => {
    projectionMode.value = mode
  }

  const setCompositeProjection = (projection: 'albers-france' | 'conic-conformal-france') => {
    compositeProjection.value = projection
  }

  const setTerritoryProjection = (territoryCode: string, projection: string) => {
    territoryProjections.value[territoryCode] = projection
    // Force Vue to detect the change in nested object
    triggerRef(territoryProjections)
    console.log('[config] setTerritoryProjection', territoryCode, projection)
  }

  const setTerritoryTranslation = (territoryCode: string, axis: 'x' | 'y', value: number) => {
    if (!territoryTranslations.value[territoryCode]) {
      territoryTranslations.value[territoryCode] = { x: 0, y: 0 }
    }
    territoryTranslations.value[territoryCode][axis] = value
    // Force Vue to detect the change in nested object
    triggerRef(territoryTranslations)
    console.log('[config] setTerritoryTranslation', territoryCode, axis, value)
  }

  const setTerritoryScale = (territoryCode: string, value: number) => {
    territoryScales.value[territoryCode] = value
    // Force Vue to detect the change in nested object
    triggerRef(territoryScales)
    console.log('[config] setTerritoryScale', territoryCode, value)
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
