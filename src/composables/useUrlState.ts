import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfigStore } from '@/stores/config'
import { useTerritoryStore } from '@/stores/territory'

/**
 * Composable for managing application state in URL parameters
 * Enables shareable links with full configuration state
 */
export function useUrlState() {
  const route = useRoute()
  const router = useRouter()
  const configStore = useConfigStore()
  const territoryStore = useTerritoryStore()

  /**
   * Serialize current state to URL-safe string
   */
  function serializeState(): Record<string, string> {
    const state: Record<string, string> = {
      atlas: configStore.selectedAtlas,
      view: configStore.viewMode,
      projection: configStore.selectedProjection || '',
      projMode: configStore.projectionMode,
      territory: configStore.territoryMode,
    }

    // Add projection parameters if customized
    if (configStore.customRotateLongitude !== null)
      state.rlon = String(configStore.customRotateLongitude)
    if (configStore.customRotateLatitude !== null)
      state.rlat = String(configStore.customRotateLatitude)
    if (configStore.customCenterLongitude !== null)
      state.clon = String(configStore.customCenterLongitude)
    if (configStore.customCenterLatitude !== null)
      state.clat = String(configStore.customCenterLatitude)
    if (configStore.customParallel1 !== null)
      state.p1 = String(configStore.customParallel1)
    if (configStore.customParallel2 !== null)
      state.p2 = String(configStore.customParallel2)

    // Add composite projection if in composite mode
    if (configStore.viewMode === 'composite-existing') {
      state.composite = configStore.compositeProjection
    }

    // Encode territory-specific settings (scales, translations)
    // Only include if not default values
    const territorySettings: Record<string, number> = {}
    let hasSettings = false

    for (const [code, scale] of Object.entries(territoryStore.territoryScales)) {
      if (scale !== 1) {
        territorySettings[`s_${code}`] = scale
        hasSettings = true
      }
    }

    for (const [code, translation] of Object.entries(territoryStore.territoryTranslations)) {
      if (translation.x !== 0 || translation.y !== 0) {
        territorySettings[`tx_${code}`] = translation.x
        territorySettings[`ty_${code}`] = translation.y
        hasSettings = true
      }
    }

    if (hasSettings) {
      state.t = JSON.stringify(territorySettings)
    }

    return state
  }

  /**
   * Deserialize state from URL parameters
   */
  function deserializeState(params: Record<string, any>) {
    // Basic configuration
    if (params.atlas)
      configStore.selectedAtlas = params.atlas
    if (params.view)
      configStore.viewMode = params.view
    if (params.projection)
      configStore.selectedProjection = params.projection
    if (params.projMode)
      configStore.projectionMode = params.projMode
    if (params.territory)
      configStore.territoryMode = params.territory

    // Projection parameters
    if (params.rlon !== undefined)
      configStore.customRotateLongitude = Number(params.rlon)
    if (params.rlat !== undefined)
      configStore.customRotateLatitude = Number(params.rlat)
    if (params.clon !== undefined)
      configStore.customCenterLongitude = Number(params.clon)
    if (params.clat !== undefined)
      configStore.customCenterLatitude = Number(params.clat)
    if (params.p1 !== undefined)
      configStore.customParallel1 = Number(params.p1)
    if (params.p2 !== undefined)
      configStore.customParallel2 = Number(params.p2)

    // Composite projection
    if (params.composite)
      configStore.compositeProjection = params.composite

    // Territory settings
    if (params.t) {
      try {
        const settings = JSON.parse(params.t)
        for (const [key, value] of Object.entries(settings)) {
          if (key.startsWith('s_')) {
            const code = key.substring(2)
            territoryStore.setTerritoryScale(code, Number(value))
          }
          else if (key.startsWith('tx_')) {
            const code = key.substring(3)
            territoryStore.setTerritoryTranslation(code, 'x', Number(value))
          }
          else if (key.startsWith('ty_')) {
            const code = key.substring(3)
            territoryStore.setTerritoryTranslation(code, 'y', Number(value))
          }
        }
      }
      catch (error) {
        console.error('Failed to parse territory settings from URL:', error)
      }
    }
  }

  /**
   * Update URL with current state
   */
  async function updateUrl() {
    const state = serializeState()
    await router.replace({
      query: state,
    })
  }

  /**
   * Restore state from URL on load
   */
  function restoreFromUrl() {
    if (route.query && Object.keys(route.query).length > 0) {
      deserializeState(route.query)
      return true
    }
    return false
  }

  /**
   * Generate shareable URL
   */
  const shareableUrl = computed(() => {
    const state = serializeState()
    const url = new URL(window.location.origin + window.location.pathname)
    url.search = new URLSearchParams(state).toString()
    return url.toString()
  })

  /**
   * Copy shareable URL to clipboard
   */
  async function copyShareableUrl() {
    try {
      await navigator.clipboard.writeText(shareableUrl.value)
      return true
    }
    catch (error) {
      console.error('Failed to copy URL:', error)
      return false
    }
  }

  /**
   * Setup automatic URL syncing (optional)
   */
  function enableAutoSync() {
    // Watch for config changes and update URL
    watch(
      () => ({
        atlas: configStore.selectedAtlas,
        view: configStore.viewMode,
        projection: configStore.selectedProjection,
        projMode: configStore.projectionMode,
        territory: configStore.territoryMode,
      }),
      () => {
        updateUrl()
      },
      { deep: true },
    )
  }

  return {
    serializeState,
    deserializeState,
    updateUrl,
    restoreFromUrl,
    shareableUrl,
    copyShareableUrl,
    enableAutoSync,
  }
}
