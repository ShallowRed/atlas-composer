<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import { getSharedPresetDefaults } from '@/composables/usePresetDefaults'
import { getCurrentLocale, resolveI18nValue } from '@/core/atlases/i18n-utils'
import { getAtlasConfig } from '@/core/atlases/registry'
import { PresetLoader } from '@/services/presets/preset-loader'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'

const { t } = useI18n()
const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()
const parameterStore = useParameterStore()
const presetDefaults = getSharedPresetDefaults()

const isLoading = ref(false)
const loadError = ref<string | null>(null)
const selectedPreset = ref<string>('')

// Cache for preset metadata to avoid repeated fetches
const presetMetadata = ref<Map<string, { name?: string | Record<string, string> }>>(new Map())

// Get available presets from current atlas config
const availablePresets = computed(() => {
  const atlasConfig = getAtlasConfig(configStore.selectedAtlas)
  return atlasConfig.availablePresets || []
})

// Current preset selection
const currentPreset = computed({
  get: () => {
    return selectedPreset.value || getAtlasConfig(configStore.selectedAtlas).defaultPreset || ''
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

        // Extract territory parameters from preset
        const territoryParameters = PresetLoader.extractTerritoryParameters(result.preset)

        // Clear ALL existing parameter overrides first (from any previous preset or edits)
        // Get all territories that currently have any parameters set
        const allCurrentTerritoryCodes = new Set<string>()
        // Check all filtered territories for any existing parameter overrides
        for (const territory of geoDataStore.filteredTerritories) {
          const params = parameterStore.getTerritoryParameters(territory.code)
          if (Object.keys(params).length > 0) {
            allCurrentTerritoryCodes.add(territory.code)
          }
        }
        // Also include territories from the new preset
        Object.keys(defaults.projections).forEach(code => allCurrentTerritoryCodes.add(code))

        // Clear overrides for all territories
        allCurrentTerritoryCodes.forEach((territoryCode) => {
          parameterStore.clearAllTerritoryOverrides(territoryCode)
        })

        // Store original preset defaults for reset functionality
        presetDefaults.storePresetDefaults(defaults, territoryParameters)

        // Apply global preset parameters to config store
        if (result.preset.referenceScale !== undefined) {
          configStore.referenceScale = result.preset.referenceScale
        }
        if (result.preset.canvasDimensions) {
          configStore.canvasDimensions = {
            width: result.preset.canvasDimensions.width,
            height: result.preset.canvasDimensions.height,
          }
        }

        // Apply to parameter store - set each territory individually
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

        // Apply territory parameters from preset (after clearing to ensure clean state)
        // Filter out 'scale' parameter since it's computed from baseScale * scaleMultiplier
        // Applying the old computed scale value would prevent the new preset from calculating correctly
        const parametersWithoutScale: Record<string, any> = {}
        Object.entries(territoryParameters).forEach(([code, params]) => {
          const { scale, ...paramsWithoutScale } = params
          parametersWithoutScale[code] = paramsWithoutScale
        })

        parameterStore.initializeFromPreset({}, parametersWithoutScale)

        // CRITICAL: Update CompositeProjection with new parameters from preset
        // The parameter store has been updated, but the CompositeProjection needs to re-read parameters
        if (geoDataStore.cartographer?.customComposite) {
          // Update each territory's parameters in the CompositeProjection
          Object.keys(parametersWithoutScale).forEach((territoryCode) => {
            geoDataStore.cartographer?.updateTerritoryParameters(territoryCode)
          })
        }

        // Log warnings if present but don't treat as errors
        if (result.warnings.length > 0) {
          console.warn(`[PresetSelector] Preset loaded with warnings:`, result.warnings)
        }

        // Update selected preset tracking
        selectedPreset.value = presetId
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
        const metadata = await PresetLoader.loadPresetMetadata(presetId)
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
