<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import { getAtlasConfig } from '@/core/atlases/registry'
import { PresetLoader } from '@/services/presets/preset-loader'
import { useConfigStore } from '@/stores/config'
import { useTerritoryStore } from '@/stores/territory'

const { t } = useI18n()
const configStore = useConfigStore()
const territoryStore = useTerritoryStore()

const isLoading = ref(false)
const loadError = ref<string | null>(null)

// Get available presets from current atlas config
const availablePresets = computed(() => {
  const atlasConfig = getAtlasConfig(configStore.selectedAtlas)
  return atlasConfig.availablePresets || []
})

// Current preset selection
const currentPreset = computed({
  get: () => {
    const atlasConfig = getAtlasConfig(configStore.selectedAtlas)
    return atlasConfig.defaultPreset || ''
  },
  set: async (presetId: string) => {
    if (!presetId || isLoading.value)
      return

    isLoading.value = true
    loadError.value = null

    try {
      console.info(`[PresetSelector] Loading preset: ${presetId}`)
      const result = await PresetLoader.loadPreset(presetId)

      if (result.success && result.preset) {
        // Convert preset to defaults
        const defaults = PresetLoader.convertToDefaults(result.preset)

        // Apply to territory store - set each territory individually
        Object.entries(defaults.projections).forEach(([code, projection]) => {
          territoryStore.setTerritoryProjection(code, projection)
        })
        Object.entries(defaults.translations).forEach(([code, translation]) => {
          territoryStore.setTerritoryTranslation(code, 'x', translation.x)
          territoryStore.setTerritoryTranslation(code, 'y', translation.y)
        })
        Object.entries(defaults.scales).forEach(([code, scale]) => {
          territoryStore.setTerritoryScale(code, scale)
        })

        // Log warnings if present but don't treat as errors
        if (result.warnings.length > 0) {
          console.warn(`[PresetSelector] Preset loaded with warnings:`, result.warnings)
        }

        console.info(`[PresetSelector] Successfully applied preset: ${presetId}`)
      }
      else {
        loadError.value = result.errors.join(', ')
        console.error(`[PresetSelector] Failed to load preset:`, result.errors)
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

// Preset options for dropdown
const presetOptions = computed(() => {
  return availablePresets.value.map(presetId => ({
    value: presetId,
    label: formatPresetLabel(presetId),
  }))
})

// Format preset ID into readable label
function formatPresetLabel(presetId: string): string {
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
