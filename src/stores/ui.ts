import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ToastMessage {
  id: string
  message: string
  type: 'error' | 'success' | 'warning' | 'info'
  duration?: number
}

export const useUIStore = defineStore('ui', () => {
  const theme = ref('light')

  const showGraticule = ref(false)
  const showCompositionBorders = ref(true)
  const showMapLimits = ref(true)

  const toasts = ref<ToastMessage[]>([])
  let toastIdCounter = 0

  function initializeTheme() {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      theme.value = savedTheme
      applyTheme(savedTheme)
    }
    else {
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
    showCompositionBorders.value = defaults.showCompositionBorders ?? true
    showMapLimits.value = defaults.showMapLimits ?? true
  }

  function showToast(
    message: string,
    type: ToastMessage['type'] = 'info',
    duration = 3000,
  ) {
    const id = `toast-${toastIdCounter++}`
    const toast: ToastMessage = { id, message, type, duration }
    toasts.value.push(toast)

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
    theme,
    showGraticule,
    showCompositionBorders,
    showMapLimits,
    toasts,

    initializeTheme,
    setTheme,
    initializeDisplayOptions,
    showToast,
    dismissToast,
    clearAllToasts,
  }
})
