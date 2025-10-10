import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * UI Store - Manages user interface state and preferences
 * Separated from domain logic (config store) for better organization
 */
export const useUIStore = defineStore('ui', () => {
  // Theme
  const theme = ref('light')

  // Display toggles
  const showGraticule = ref(false)
  const showSphere = ref(false)
  const showCompositionBorders = ref(false)
  const showMapLimits = ref(false)

  // Actions
  function initializeTheme() {
    // Migration: Check for old 'atlas-theme' key from config store
    const oldThemeKey = localStorage.getItem('atlas-theme')
    if (oldThemeKey) {
      // Migrate to new key
      localStorage.setItem('theme', oldThemeKey)
      localStorage.removeItem('atlas-theme')
      theme.value = oldThemeKey
      applyTheme(oldThemeKey)
      return
    }

    // Check for saved theme preference (new key)
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      theme.value = savedTheme
      applyTheme(savedTheme)
    }
    else {
      // Default to system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      theme.value = prefersDark ? 'dark' : 'light'
      applyTheme(theme.value)
    }
  }

  function setTheme(newTheme: string) {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  }

  function applyTheme(themeName: string) {
    document.documentElement.setAttribute('data-theme', themeName)
  }

  function initializeDisplayOptions(defaults: {
    showGraticule?: boolean
    showSphere?: boolean
    showCompositionBorders?: boolean
    showMapLimits?: boolean
  }) {
    showGraticule.value = defaults.showGraticule ?? false
    showSphere.value = defaults.showSphere ?? false
    showCompositionBorders.value = defaults.showCompositionBorders ?? false
    showMapLimits.value = defaults.showMapLimits ?? false
  }

  return {
    // State
    theme,
    showGraticule,
    showSphere,
    showCompositionBorders,
    showMapLimits,

    // Actions
    initializeTheme,
    setTheme,
    initializeDisplayOptions,
  }
})
