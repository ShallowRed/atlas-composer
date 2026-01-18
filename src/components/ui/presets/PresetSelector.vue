<script setup lang="ts">
import type { PresetId, TerritoryCode } from '@/types/branded'

import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import { getCurrentLocale, resolveI18nValue } from '@/core/atlases/i18n-utils'
import { getAtlasPresets } from '@/core/atlases/registry'
import { InitializationService } from '@/services/initialization/initialization-service'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useViewStore } from '@/stores/view'
import { logger } from '@/utils/logger'

const debug = logger.vue.component
const { t } = useI18n()
const atlasStore = useAtlasStore()
const viewStore = useViewStore()
const geoDataStore = useGeoDataStore()

const isLoading = ref(false)
const loadError = ref<string | null>(null)
const selectedPreset = ref<PresetId | ''>('')

const currentPreset = computed({
  get: () => {
    const atlasId = atlasStore.selectedAtlasId
    const viewMode = viewStore.viewMode
    if (!atlasId || !viewMode)
      return ''

    const presets = getAtlasPresets(atlasId)
    const viewModePresets = presets.filter(p => p.type === viewMode)
    const defaultPreset = viewModePresets.find(p => p.isDefault) || viewModePresets[0]

    return selectedPreset.value || defaultPreset?.id || ''
  },
  set: async (presetId: PresetId) => {
    if (!presetId || isLoading.value)
      return

    isLoading.value = true
    loadError.value = null

    try {
      debug('Loading preset: %s', presetId)

      const result = await InitializationService.loadPreset({
        presetId,
        skipValidation: false,
      })

      if (!result.success) {
        loadError.value = result.errors.join(', ')
        debug('Failed to load preset: %o', result.errors)
        return
      }

      if (result.warnings.length > 0) {
        debug('Preset loaded with warnings: %o', result.warnings)
      }

      selectedPreset.value = presetId

      if (geoDataStore.cartographer && result.state) {
        const territoryParameters = result.state.parameters.territories

        const currentAtlasConfig = atlasStore.currentAtlasConfig
        if (currentAtlasConfig?.compositeProjectionConfig) {
          const parameterStore = useParameterStore()
          const parameterProvider = {
            getEffectiveParameters: (territoryCode: TerritoryCode) => {
              return parameterStore.getEffectiveParameters(territoryCode)
            },
            getExportableParameters: (territoryCode: TerritoryCode) => {
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
          Object.keys(territoryParameters).forEach((territoryCode) => {
            geoDataStore.cartographer!.updateTerritoryParameters(territoryCode as TerritoryCode)
          })
          debug('Updated cartographer parameters for %d territories', Object.keys(territoryParameters).length)
        }

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

const presetOptions = computed(() => {
  const atlasId = atlasStore.selectedAtlasId
  const viewMode = viewStore.viewMode
  if (!atlasId || !viewMode)
    return []

  const presets = getAtlasPresets(atlasId)

  const filteredPresets = presets.filter(preset => preset.type === viewMode)

  return filteredPresets.map((preset) => {
    return {
      value: preset.id,
      label: formatPresetLabel(preset.id as PresetId, preset.name),
      translated: true,
    }
  })
})

watch(() => [atlasStore.selectedAtlasId, viewStore.viewMode], () => {
  selectedPreset.value = '' as const
}, { immediate: true })

function formatPresetLabel(presetId: PresetId, presetName?: string | Record<string, string>): string {
  if (presetName) {
    if (typeof presetName === 'string') {
      return presetName
    }
    else {
      const currentLocale = getCurrentLocale()
      return resolveI18nValue(presetName, currentLocale)
    }
  }

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
