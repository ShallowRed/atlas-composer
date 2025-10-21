<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import { getCurrentLocale, resolveI18nValue } from '@/core/atlases/i18n-utils'
import { getAtlasPresets } from '@/core/atlases/registry'
import { InitializationService } from '@/services/initialization/initialization-service'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { logger } from '@/utils/logger'

const debug = logger.vue.component
const { t } = useI18n()
const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()

const isLoading = ref(false)
const loadError = ref<string | null>(null)
const selectedPreset = ref<string>('')

// Current preset selection
const currentPreset = computed({
  get: () => {
    const atlasId = configStore.selectedAtlas
    const viewMode = configStore.viewMode
    if (!atlasId || !viewMode)
      return ''

    // Get default preset for current view mode
    const presets = getAtlasPresets(atlasId)
    const viewModePresets = presets.filter(p => p.type === viewMode)
    const defaultPreset = viewModePresets.find(p => p.isDefault) || viewModePresets[0]

    return selectedPreset.value || defaultPreset?.id || ''
  },
  set: async (presetId: string) => {
    if (!presetId || isLoading.value)
      return

    isLoading.value = true
    loadError.value = null

    try {
      debug('Loading preset: %s', presetId)

      // Use InitializationService for consistent preset loading
      const result = await InitializationService.loadPreset({
        presetId,
        skipValidation: false,
      })

      if (!result.success) {
        loadError.value = result.errors.join(', ')
        debug('Failed to load preset: %o', result.errors)
        return
      }

      // Display warnings if any
      if (result.warnings.length > 0) {
        debug('Preset loaded with warnings: %o', result.warnings)
      }

      // Update selected preset
      selectedPreset.value = presetId

      // Trigger cartographer update if needed
      if (geoDataStore.cartographer && result.state) {
        const territoryParameters = result.state.parameters.territories

        // Check if we need to rebuild the composite projection
        // This happens when the new preset has a different set of territories
        const currentAtlasConfig = configStore.currentAtlasConfig
        if (currentAtlasConfig?.compositeProjectionConfig) {
          // Rebuild composite projection to include all territories from the preset
          const parameterStore = useParameterStore()
          const parameterProvider = {
            getEffectiveParameters: (territoryCode: string) => {
              return parameterStore.getEffectiveParameters(territoryCode)
            },
            getExportableParameters: (territoryCode: string) => {
              return parameterStore.getExportableParameters(territoryCode)
            },
          }

          geoDataStore.cartographer.rebuildCompositeProjection(
            currentAtlasConfig.compositeProjectionConfig,
            parameterProvider,
            result.state.canvas.referenceScale,
            result.state.canvas.dimensions,
          )
          debug('Rebuilt composite projection with %d territories', Object.keys(territoryParameters).length)
        }
        else {
          // Fallback to updating parameters if no composite config (shouldn't happen in composite-custom mode)
          Object.keys(territoryParameters).forEach((territoryCode) => {
            geoDataStore.cartographer!.updateTerritoryParameters(territoryCode)
          })
          debug('Updated cartographer parameters for %d territories', Object.keys(territoryParameters).length)
        }

        // Trigger render
        geoDataStore.triggerRender()
      }

      debug('Successfully loaded preset: %s', presetId)
    }
    catch (error) {
      loadError.value = error instanceof Error ? error.message : 'Unknown error'
      debug('Error loading preset: %o', error)
    }
    finally {
      isLoading.value = false
    }
  },
})

// Preset options for dropdown - gets metadata directly from atlas registry
// Filtered by current view mode
const presetOptions = computed(() => {
  const atlasId = configStore.selectedAtlas
  const viewMode = configStore.viewMode
  if (!atlasId || !viewMode)
    return []

  const presets = getAtlasPresets(atlasId)

  // Filter presets by current view mode
  const filteredPresets = presets.filter(preset => preset.type === viewMode)

  return filteredPresets.map((preset) => {
    return {
      value: preset.id,
      label: formatPresetLabel(preset.id, preset.name),
      translated: true, // formatPresetLabel returns already-translated text, not translation keys
    }
  })
})

// Reset selected preset when atlas or view mode changes
watch(() => [configStore.selectedAtlas, configStore.viewMode], () => {
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
