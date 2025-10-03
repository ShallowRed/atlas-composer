import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { PROJECTION_OPTIONS } from '../services/GeoProjectionService'

export type TerritoryMode = 'metropole-only' | 'metropole-major' | 'metropole-uncommon' | 'all-territories'
export type ActiveTab = 'vue-composite' | 'projection-composite' | 'individual-territories'

export const useConfigStore = defineStore('config', () => {
  // State
  const scalePreservation = ref(true)
  const selectedProjection = ref('albers')
  const territoryMode = ref<TerritoryMode>('metropole-major')
  const activeTab = ref<ActiveTab>('vue-composite')
  const theme = ref('light')
  
  // Territory translations (x, y offsets for DOM-TOM positioning)
  const territoryTranslations = ref<Record<string, { x: number, y: number }>>({
    'FR-GF': { x: -8, y: -2 },    // Guyane
    'FR-RE': { x: -10, y: 3 },    // Réunion
    'FR-GP': { x: -8, y: 1 },     // Guadeloupe
    'FR-MQ': { x: -8.5, y: 2.5 }, // Martinique
    'FR-YT': { x: -2, y: -5 },    // Mayotte
    'FR-MF': { x: 0, y: 0 },      // Saint-Martin
    'FR-PF': { x: 0, y: 0 },      // Polynésie française
    'FR-NC': { x: 0, y: 0 },      // Nouvelle-Calédonie
    'FR-TF': { x: 0, y: 0 },      // Terres australes
    'FR-WF': { x: 0, y: 0 },      // Wallis-et-Futuna
    'FR-PM': { x: 0, y: 0 },      // Saint-Pierre-et-Miquelon
  })
  
  // Territory scales (scale multipliers for DOM-TOM sizing)
  const territoryScales = ref<Record<string, number>>({
    'FR-GF': 1.0,  // Guyane
    'FR-RE': 1.0,  // Réunion
    'FR-GP': 1.0,  // Guadeloupe
    'FR-MQ': 1.0,  // Martinique
    'FR-YT': 1.0,  // Mayotte
    'FR-MF': 1.0,  // Saint-Martin
    'FR-PF': 1.0,  // Polynésie française
    'FR-NC': 1.0,  // Nouvelle-Calédonie
    'FR-TF': 1.0,  // Terres australes
    'FR-WF': 1.0,  // Wallis-et-Futuna
    'FR-PM': 1.0,  // Saint-Pierre-et-Miquelon
  })

  // Computed
  const showProjectionSelector = computed(() => {
    // Allow projection selector in all tabs
    return true
  })

  const showTerritorySelector = computed(() => {
    // Show territory selector in all tabs (composite views and individual territories)
    return activeTab.value === 'vue-composite' || 
           activeTab.value === 'projection-composite' || 
           activeTab.value === 'individual-territories'
  })

  const showScalePreservation = computed(() => {
    // Only show scale preservation in individual territories tab
    return activeTab.value === 'individual-territories'
  })

  const projectionGroups = computed(() => {
    const groups: { [key: string]: any[] } = {}
    
    // Composite projections are only available in the "Projection composite" tab
    const compositeProjections = ['albers-france', 'conic-conformal-france']
    
    const filteredOptions = activeTab.value === 'projection-composite'
      ? // Only show composite projections in projection-composite tab
        PROJECTION_OPTIONS.filter(option => compositeProjections.includes(option.value))
      : // Exclude composite projections from other tabs
        PROJECTION_OPTIONS.filter(option => !compositeProjections.includes(option.value))
    
    filteredOptions.forEach(option => {
      if (!groups[option.category]) {
        groups[option.category] = []
      }
      groups[option.category]!.push(option)
    })
    
    return Object.keys(groups).map(category => ({
      category,
      options: groups[category]
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

  const setActiveTab = (tab: ActiveTab) => {
    const compositeProjections = ['albers-france', 'conic-conformal-france']
    const isCurrentProjectionComposite = compositeProjections.includes(selectedProjection.value)
    
    // When switching TO projection-composite tab
    if (tab === 'projection-composite') {
      if (!isCurrentProjectionComposite) {
        // Default to albers-france if current projection is not a composite
        selectedProjection.value = 'albers-france'
      }
    }
    // When switching FROM projection-composite tab to another tab
    else if (activeTab.value === 'projection-composite' && isCurrentProjectionComposite) {
      // Default to regular albers if current projection is composite
      selectedProjection.value = 'albers'
    }
    
    activeTab.value = tab
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
    activeTab: activeTab.value,
    territoryTranslations: territoryTranslations.value,
    territoryScales: territoryScales.value
  })

  return {
    // State
    scalePreservation,
    selectedProjection,
    territoryMode,
    activeTab,
    theme,
    territoryTranslations,
    territoryScales,
    
    // Computed
    showProjectionSelector,
    showTerritorySelector,
    showScalePreservation,
    projectionGroups,
    
    // Actions
    setScalePreservation,
    setSelectedProjection,
    setTerritoryMode,
    setActiveTab,
    setTheme,
    setTerritoryTranslation,
    setTerritoryScale,
    initializeTheme,
    getCartographerSettings
  }
})