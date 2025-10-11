import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

interface FavoriteProjection {
  id: string
  name: string
  atlasId: string
  timestamp: number
}

interface RecentProjection {
  projectionId: string
  atlasId: string
  timestamp: number
}

const FAVORITES_KEY = 'atlas-composer-favorites'
const RECENT_KEY = 'atlas-composer-recent'
const MAX_RECENT = 10

/**
 * Store for managing user's favorite and recently used projections
 * Persisted to localStorage
 */
export const useFavoritesStore = defineStore('favorites', () => {
  // State
  const favorites = ref<FavoriteProjection[]>([])
  const recentProjections = ref<RecentProjection[]>([])

  // Load from localStorage on initialization
  function loadFromStorage() {
    try {
      const storedFavorites = localStorage.getItem(FAVORITES_KEY)
      if (storedFavorites) {
        favorites.value = JSON.parse(storedFavorites)
      }

      const storedRecent = localStorage.getItem(RECENT_KEY)
      if (storedRecent) {
        recentProjections.value = JSON.parse(storedRecent)
      }
    }
    catch (error) {
      console.error('Failed to load favorites from storage:', error)
    }
  }

  // Save to localStorage
  function saveToStorage() {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites.value))
      localStorage.setItem(RECENT_KEY, JSON.stringify(recentProjections.value))
    }
    catch (error) {
      console.error('Failed to save favorites to storage:', error)
    }
  }

  // Computed
  const hasFavorites = computed(() => favorites.value.length > 0)
  const hasRecent = computed(() => recentProjections.value.length > 0)

  // Check if projection is favorited
  function isFavorite(projectionId: string, atlasId: string) {
    return favorites.value.some(
      fav => fav.id === projectionId && fav.atlasId === atlasId,
    )
  }

  // Add to favorites
  function addFavorite(projectionId: string, projectionName: string, atlasId: string) {
    if (!isFavorite(projectionId, atlasId)) {
      favorites.value.push({
        id: projectionId,
        name: projectionName,
        atlasId,
        timestamp: Date.now(),
      })
      saveToStorage()
    }
  }

  // Remove from favorites
  function removeFavorite(projectionId: string, atlasId: string) {
    favorites.value = favorites.value.filter(
      fav => !(fav.id === projectionId && fav.atlasId === atlasId),
    )
    saveToStorage()
  }

  // Toggle favorite
  function toggleFavorite(projectionId: string, projectionName: string, atlasId: string) {
    if (isFavorite(projectionId, atlasId)) {
      removeFavorite(projectionId, atlasId)
    }
    else {
      addFavorite(projectionId, projectionName, atlasId)
    }
  }

  // Get favorites for specific atlas
  function getFavoritesForAtlas(atlasId: string) {
    return favorites.value.filter(fav => fav.atlasId === atlasId)
  }

  // Add to recent projections
  function addRecent(projectionId: string, atlasId: string) {
    // Remove if already exists
    recentProjections.value = recentProjections.value.filter(
      rec => !(rec.projectionId === projectionId && rec.atlasId === atlasId),
    )

    // Add to beginning
    recentProjections.value.unshift({
      projectionId,
      atlasId,
      timestamp: Date.now(),
    })

    // Limit to MAX_RECENT
    if (recentProjections.value.length > MAX_RECENT) {
      recentProjections.value = recentProjections.value.slice(0, MAX_RECENT)
    }

    saveToStorage()
  }

  // Get recent projections for specific atlas
  function getRecentForAtlas(atlasId: string) {
    return recentProjections.value.filter(rec => rec.atlasId === atlasId)
  }

  // Clear all favorites
  function clearFavorites() {
    favorites.value = []
    saveToStorage()
  }

  // Clear recent projections
  function clearRecent() {
    recentProjections.value = []
    saveToStorage()
  }

  // Initialize
  loadFromStorage()

  return {
    // State
    favorites,
    recentProjections,

    // Computed
    hasFavorites,
    hasRecent,

    // Methods
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    getFavoritesForAtlas,
    addRecent,
    getRecentForAtlas,
    clearFavorites,
    clearRecent,
  }
})
