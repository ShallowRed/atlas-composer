import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { PROJECTION_OPTIONS } from '../services/GeoProjectionService'

export type TerritoryMode = 'metropole-only' | 'metropole-major' | 'metropole-uncommon' | 'all-territories'
export type ActiveTab = 'vue-composite' | 'projection-composite' | 'individual-territories'

export const useConfigStore = defineStore('config', () => {
  // State
  const scalePreservation = ref(true)
  const selectedProjection = ref('albers-france')
  const territoryMode = ref<TerritoryMode>('metropole-major')
  const activeTab = ref<ActiveTab>('vue-composite')
  const theme = ref('light')
  
  // Territory translations (x, y offsets for DOM-TOM positioning)
  const territoryTranslations = ref<Record<string, { x: number, y: number }>>({
    'FR-GF': { x: -8, y: -2 },  // Guyane
    'FR-RE': { x: -10, y: 3 },  // Réunion
    'FR-GP': { x: -8, y: 1 },   // Guadeloupe
    'FR-MQ': { x: -8.5, y: 2.5 }, // Martinique
    'FR-YT': { x: -2, y: -5 },  // Mayotte
  })
  
  // Territory scales (scale multipliers for DOM-TOM sizing)
  const territoryScales = ref<Record<string, number>>({
    'FR-GF': 1.0,  // Guyane
    'FR-RE': 1.0,  // Réunion
    'FR-GP': 1.0,  // Guadeloupe
    'FR-MQ': 1.0,  // Martinique
    'FR-YT': 1.0,  // Mayotte
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
    
    // Filter projections based on active tab
    const filteredOptions = activeTab.value === 'projection-composite'
      ? PROJECTION_OPTIONS.filter(option => 
          option.value === 'albers-france' || option.value === 'conic-conformal-france'
        )
      : PROJECTION_OPTIONS
    
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
    activeTab.value = tab
    
    // When switching to projection-composite tab, ensure a valid composite projection is selected
    if (tab === 'projection-composite') {
      const validProjections = ['albers-france', 'conic-conformal-france']
      if (!validProjections.includes(selectedProjection.value)) {
        // Default to albers-france if current projection is not valid for this tab
        selectedProjection.value = 'albers-france'
      }
    }
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