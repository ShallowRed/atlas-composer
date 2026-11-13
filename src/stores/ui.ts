import type { AppError } from '@/core/types/errors'
import { defineStore } from 'pinia'
import { ref } from 'vue'

type ToastContent = { message: string } | { error: AppError }

type ToastMessage = ToastContent & {
  id: string
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

  // src/index.html chooses the theme before the first paint, from localStorage.theme or prefers-color-scheme
  function initializeTheme() {
    theme.value = document.documentElement.dataset.theme ?? 'light'
  }

  function setTheme(newTheme: string) {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  }

  function applyTheme(themeName: string) {
    document.documentElement.setAttribute('data-theme', themeName)
  }

  function showToast(
    message: string,
    type: ToastMessage['type'] = 'info',
    duration = 3000,
  ) {
    return addToast({ message }, type, duration)
  }

  function showErrorToast(error: AppError, duration: number) {
    return addToast({ error }, 'error', duration)
  }

  function addToast(content: ToastContent, type: ToastMessage['type'], duration: number) {
    const id = `toast-${toastIdCounter++}`
    const toast: ToastMessage = { ...content, id, type, duration }
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

  return {
    theme,
    showGraticule,
    showCompositionBorders,
    showMapLimits,
    toasts,

    initializeTheme,
    setTheme,
    showToast,
    showErrorToast,
    dismissToast,
  }
})
