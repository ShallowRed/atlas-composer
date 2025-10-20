/**
 * useApplicationState Composable
 *
 * Phase 5: Consolidate Watchers
 *
 * Central orchestration point for application state changes.
 * Replaces duplicate watchers across config store and useAtlasData.
 *
 * Responsibilities:
 * - Single watcher for atlas changes (removes duplication)
 * - Single watcher for view mode changes
 * - Single watcher for territory mode changes
 * - Coordinates with InitializationService for state changes
 * - Handles loading states and errors
 *
 * Design:
 * - Stores remain passive (actions only, no watchers)
 * - All reactive orchestration happens here
 * - Clean separation: stores = state, composable = reactions
 */

import { watch } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { useLoadingState } from './useLoadingState'

export function useApplicationState() {
  const configStore = useConfigStore()
  const geoDataStore = useGeoDataStore()
  const { withMinLoadingTime } = useLoadingState()

  /**
   * Setup watchers for application state changes
   * Call this once during app initialization (e.g., in MapView.vue onMounted)
   */
  function setupWatchers() {
    // Track the last atlas ID to detect actual changes (not just initial reactivity)
    let lastAtlasId: string | null = configStore.currentAtlasConfig?.id ?? null
    console.debug('[useApplicationState] setupWatchers - initializing lastAtlasId:', lastAtlasId)

    /**
     * Watch for atlas changes
     * Phase 5: Single source of truth for atlas change reactions
     * Removes duplicate watchers from config.ts and useAtlasData.ts
     */
    watch(() => configStore.currentAtlasConfig, async (newConfig) => {
      console.debug('[useApplicationState] currentAtlasConfig changed:', {
        newConfig: newConfig?.id,
        lastAtlasId,
        willReinitialize: newConfig && lastAtlasId !== null && lastAtlasId !== newConfig.id,
      })

      // Track the last loaded atlas ID to detect changes
      if (newConfig) {
        const newAtlasId = newConfig.id
        // Only reinitialize if the atlas actually changed (not just initial load)
        if (lastAtlasId !== null && lastAtlasId !== newAtlasId) {
          console.info(`[useApplicationState] Atlas changed from '${lastAtlasId}' to '${newAtlasId}', reinitializing...`)

          await withMinLoadingTime(async () => {
            await geoDataStore.reinitialize()
            console.info('[useApplicationState] Reinitialization complete, data preloaded by InitializationService')
          })

          console.info(`[useApplicationState] Atlas change complete for '${newAtlasId}'`)
        }
        else {
          console.debug(`[useApplicationState] Skipping reinitialize - lastAtlasId: ${lastAtlasId}, newAtlasId: ${newAtlasId}`)
        }
        lastAtlasId = newAtlasId
      }
      else {
        console.debug('[useApplicationState] currentAtlasConfig is null, skipping')
      }
    })

    /**
     * Watch for view mode changes
     * Phase 5: Centralized view mode change handling
     * Logs only - data already preloaded in Phase 4
     */
    watch(() => configStore.viewMode, (newMode, oldMode) => {
      console.info('[useApplicationState] viewMode changed:', { oldMode, newMode })
      console.info('[useApplicationState] Data already preloaded, view mode switch is synchronous')
    })

    /**
     * Watch for territory mode changes
     * Only affects unified mode - need to reload unified data with new territory selection
     */
    watch(() => configStore.territoryMode, async (newMode, oldMode) => {
      if (configStore.viewMode === 'unified') {
        console.info('[useApplicationState] territoryMode changed in unified mode:', { oldMode, newMode })

        await withMinLoadingTime(async () => {
          await geoDataStore.loadRawUnifiedData(newMode)
        })

        console.info('[useApplicationState] Unified data reloaded for new territory mode')
      }
    })

    console.info('[useApplicationState] Watchers setup complete')
  }

  return {
    setupWatchers,
  }
}
