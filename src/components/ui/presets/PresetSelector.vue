<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import { getCurrentLocale, resolveI18nValue } from '@/core/atlases/i18n-utils'
import { PresetApplicationService } from '@/services/presets/preset-application-service'
import { PresetLoader } from '@/services/presets/preset-loader'
import { useConfigStore } from '@/stores/config'

const { t } = useI18n()
const configStore = useConfigStore()

const isLoading = ref(false)
const loadError = ref<string | null>(null)
const selectedPreset = ref<string>('')

// Cache for preset metadata to avoid repeated fetches
const presetMetadata = ref<Map<string, { name?: string | Record<string, string> }>>(new Map())

// Get available presets from current atlas config
const availablePresets = computed(() => {
  const atlasConfig = configStore.currentAtlasConfig
  if (!atlasConfig)
    return []
  return atlasConfig.availablePresets || []
})

// Current preset selection
const currentPreset = computed({
  get: () => {
    const atlasConfig = configStore.currentAtlasConfig
    return selectedPreset.value || atlasConfig?.defaultPreset || ''
  },
  set: async (presetId: string) => {
    if (!presetId || isLoading.value)
      return

    isLoading.value = true
    loadError.value = null

    try {
      console.info(`[PresetSelector] Loading composite-custom preset: ${presetId}`)
      const loadResult = await PresetLoader.loadPreset(presetId)

      if (loadResult.success && loadResult.data) {
        // Composite-custom presets use the atlas initialization path, not PresetApplicationService
        // We need to check if this is a composite-custom preset and handle it appropriately
        if (loadResult.data.type === 'composite-custom') {
          // Use AtlasCoordinator pattern: converters + manual store updates
          const { convertToDefaults, extractTerritoryParameters } = PresetLoader
          const presetDefaults = convertToDefaults(loadResult.data.config)
          const presetTerritoryParameters = extractTerritoryParameters(loadResult.data.config)

          // CRITICAL: Handle territory mismatch - preset may have fewer territories than atlas allows
          // Territories not in preset will NOT be rendered (no fallback parameters)
          const allTerritories = configStore.atlasService.getAllTerritories()
          const presetTerritoryCodes = new Set(Object.keys(presetDefaults.projections))

          // Identify missing territories
          const missingTerritories = allTerritories.filter(t => !presetTerritoryCodes.has(t.code))

          // Use preset defaults directly (no fallback for missing territories)
          const defaults = presetDefaults
          const territoryParameters = presetTerritoryParameters

          // Debug: Log extracted territory parameters
          console.info('[PresetSelector] Extracted territory parameters:', Object.keys(territoryParameters).map(code => ({
            code,
            hasProjectionId: !!territoryParameters[code]?.projectionId,
            projectionId: territoryParameters[code]?.projectionId,
          })))

          // Log territory mismatch information
          if (missingTerritories.length > 0) {
            console.info(
              `[PresetSelector] Preset defines ${presetTerritoryCodes.size} territories, atlas allows ${allTerritories.length}. ${missingTerritories.length} territories will NOT be rendered: ${missingTerritories.map(t => t.code).join(', ')}`,
            )
          }

          // Apply to stores manually (same as AtlasCoordinator does)
          const parameterStore = await import('@/stores/parameters').then(m => m.useParameterStore())

          // Apply projections, translations, scales
          Object.entries(defaults.projections).forEach(([code, projection]) => {
            parameterStore.setTerritoryProjection(code, projection)
          })
          Object.entries(defaults.translations).forEach(([code, translation]) => {
            parameterStore.setTerritoryTranslation(code, 'x', translation.x)
            parameterStore.setTerritoryTranslation(code, 'y', translation.y)
          })
          Object.entries(defaults.scales).forEach(([code, scale]) => {
            parameterStore.setTerritoryParameter(code, 'scaleMultiplier', scale)
          })

          // Apply territory parameters
          if (territoryParameters && Object.keys(territoryParameters).length > 0) {
            const validationErrors = parameterStore.initializeFromPreset({}, territoryParameters as any)
            if (validationErrors.length > 0) {
              console.warn('[PresetSelector] Parameter validation warnings:', validationErrors)
            }
          }

          // Apply global preset parameters to config store
          if (loadResult.data.config.referenceScale !== undefined) {
            configStore.referenceScale = loadResult.data.config.referenceScale
          }
          if (loadResult.data.config.canvasDimensions) {
            configStore.canvasDimensions = loadResult.data.config.canvasDimensions
          }

          // CRITICAL: Update CompositeProjection with new parameters for each territory
          // This triggers the projection to reinitialize with the new preset values
          const geoDataStore = await import('@/stores/geoData').then(m => m.useGeoDataStore())
          if (geoDataStore.cartographer) {
            Object.keys(territoryParameters).forEach((territoryCode) => {
              geoDataStore.cartographer!.updateTerritoryParameters(territoryCode)
            })
            console.info(`[PresetSelector] Updated CompositeProjection for ${Object.keys(territoryParameters).length} territories`)

            // Force Vue reactivity to trigger re-render
            geoDataStore.triggerRender()
            console.info('[PresetSelector] Triggered map re-render')
          }
          else {
            console.warn('[PresetSelector] Cartographer not available, preset changes may not be visible until next render')
          }

          // Log warnings if present
          if (loadResult.warnings.length > 0) {
            console.warn(`[PresetSelector] Preset loaded with warnings:`, loadResult.warnings)
          }

          selectedPreset.value = presetId
          console.info(`[PresetSelector] Successfully applied composite-custom preset: ${presetId}`)
        }
        else {
          // For non-composite-custom presets (shouldn't happen in this component, but handle gracefully)
          const applyResult = PresetApplicationService.applyPreset(loadResult.data)

          if (applyResult.success) {
            if (loadResult.warnings.length > 0) {
              console.warn(`[PresetSelector] Preset loaded with warnings:`, loadResult.warnings)
            }
            if (applyResult.warnings.length > 0) {
              console.warn(`[PresetSelector] Preset applied with warnings:`, applyResult.warnings)
            }
            selectedPreset.value = presetId
            console.info(`[PresetSelector] Successfully applied preset: ${presetId}`)
          }
          else {
            loadError.value = applyResult.errors.join(', ')
            console.error(`[PresetSelector] Failed to apply preset:`, applyResult.errors)
          }
        }
      }
      else {
        loadError.value = loadResult.errors.join(', ')
        console.error(`[PresetSelector] Failed to load preset:`, loadResult.errors)
      }
    }
    catch (error) {
      loadError.value = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[PresetSelector] Error loading preset:`, error)
    }
    finally {
      isLoading.value = false
    }
  },
})

// Preset options for dropdown - loads metadata asynchronously
const presetOptions = computed(() => {
  return availablePresets.value.map((presetId) => {
    // Try to get cached metadata first
    const metadata = presetMetadata.value.get(presetId)

    return {
      value: presetId,
      label: formatPresetLabel(presetId, metadata?.name),
      translated: true, // formatPresetLabel returns already-translated text, not translation keys
    }
  })
})

// Load metadata for all available presets
watch(availablePresets, async (newPresets) => {
  for (const presetId of newPresets) {
    if (!presetMetadata.value.has(presetId)) {
      try {
        const metadata = await PresetLoader.loadMetadata(presetId)
        if (metadata) {
          presetMetadata.value.set(presetId, metadata)
        }
      }
      catch (error) {
        console.warn(`Failed to load metadata for preset ${presetId}:`, error)
      }
    }
  }
}, { immediate: true })

// Reset selected preset when atlas changes
watch(() => configStore.selectedAtlas, () => {
  selectedPreset.value = ''
}, { immediate: true })

// Format preset ID into readable label using name from schema if available
function formatPresetLabel(presetId: string, presetName?: string | Record<string, string>): string {
  // If preset has a name property, use i18n resolution
  if (presetName) {
    if (typeof presetName === 'string') {
      return presetName
    }
    else {
      // Use i18n resolution for localized names
      const currentLocale = getCurrentLocale()
      return resolveI18nValue(presetName, currentLocale)
    }
  }

  // Fallback to filename-based approach
  // Remove atlas prefix and convert to title case
  // e.g., "france-default" -> "Default"
  // e.g., "france-compact" -> "Compact"
  const parts = presetId.split('-')
  if (parts.length > 1) {
    const label = parts.slice(1).join(' ')
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  return presetId
}
</script>

<template>
  <div class="space-y-2">
    <DropdownControl
      v-model="currentPreset"
      :label="t('presets.label')"
      :options="presetOptions"
      icon="ri-layout-grid-line"
      :disabled="isLoading || presetOptions.length === 0"
    />

    <div
      v-if="isLoading"
      class="flex items-center gap-2 text-sm text-base-content/70"
    >
      <span class="loading loading-spinner loading-xs" />
      <span>{{ t('presets.loading') }}</span>
    </div>

    <div
      v-if="loadError"
      class="alert alert-error text-xs p-2"
    >
      <i class="ri-error-warning-line" />
      <span>{{ loadError }}</span>
    </div>
  </div>
</template>
