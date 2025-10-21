import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * UI Store - Manages user interface state and preferences
 * Separated from domain logic (config store) for better organization
 *
 * Note: Globe outline (showSphere) is determined by view mode via ViewOrchestrationService,
 * not stored as user preference
 */
export interface ToastMessage {
  id: string
  message: string
  type: 'error' | 'success' | 'warning' | 'info'
  duration?: number
}

export const useUIStore = defineStore('ui', () => {
  // Theme
  const theme = ref('light')

  // Display toggles
  const showGraticule = ref(false)
  const showCompositionBorders = ref(true) // Default to true for better UX with clip extent editing
  const showMapLimits = ref(true) // Default to true for better visualization

  // Toast notifications
  const toasts = ref<ToastMessage[]>([])
  let toastIdCounter = 0

  // Actions
  function initializeTheme() {
    // Check for saved theme preference
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
    showCompositionBorders?: boolean
    showMapLimits?: boolean
  }) {
    showGraticule.value = defaults.showGraticule ?? false
    showCompositionBorders.value = defaults.showCompositionBorders ?? true // Default to true
    showMapLimits.value = defaults.showMapLimits ?? true // Default to true
  }

  function showToast(
    message: string,
    type: ToastMessage['type'] = 'info',
    duration = 3000,
  ) {
    const id = `toast-${toastIdCounter++}`
    const toast: ToastMessage = { id, message, type, duration }
    toasts.value.push(toast)

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id)
      }, duration)
    }

    return id
  }

  function dismissToast(id: string) {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  function clearAllToasts() {
    toasts.value = []
  }

  return {
    // State
    theme,
    showGraticule,
    showCompositionBorders,
    showMapLimits,
    toasts,

    // Actions
    initializeTheme,
    setTheme,
    initializeDisplayOptions,
    showToast,
    dismissToast,
    clearAllToasts,
  }
})
