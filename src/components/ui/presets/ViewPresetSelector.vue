<script setup lang="ts">
import type { DropdownOption } from '@/components/ui/forms/DropdownControl.vue'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import { useConfigStore } from '@/stores/config'
import { logger } from '@/utils/logger'

const debug = logger.vue.component
const { t } = useI18n()
const configStore = useConfigStore()

/**
 * Computed dropdown options from available view presets
 */
const presetOptions = computed<DropdownOption[]>(() => {
  return configStore.availableViewPresets.map(preset => ({
    value: preset.id,
    label: preset.name,
    translated: true, // Preset names are already in final form
    icon: getPresetIcon(preset.type),
  }))
})

/**
 * Get icon for preset based on view mode
 */
function getPresetIcon(viewMode: string): string {
  switch (viewMode) {
    case 'unified':
      return 'ri-global-line'
    case 'split':
      return 'ri-layout-grid-line'
    case 'built-in-composite':
      return 'ri-map-2-line'
    default:
      return 'ri-file-settings-line'
  }
}

/**
 * Should show preset selector?
 * Only for unified, split, and built-in-composite modes
 */
const shouldShow = computed(() => {
  const supportedModes = ['unified', 'split', 'built-in-composite']
  return supportedModes.includes(configStore.viewMode)
})

/**
 * Handle preset selection
 */
async function handlePresetChange(presetId: string) {
  if (!presetId) {
    configStore.clearViewPreset()
    return
  }

  try {
    await configStore.loadViewPreset(presetId)
  }
  catch (error) {
    debug('Failed to load preset: %o', error)
    // Could show error toast here
  }
}

/**
 * Computed model value for the dropdown
 */
const selectedPreset = computed({
  get: () => configStore.currentViewPreset || '',
  set: (value: string) => {
    handlePresetChange(value)
  },
})

/**
 * Label based on current view mode
 */
const label = computed(() => {
  switch (configStore.viewMode) {
    case 'unified':
      return t('preset.unified.select')
    case 'split':
      return t('preset.split.select')
    case 'built-in-composite':
      return t('preset.compositeExisting.select')
    default:
      return t('preset.select')
  }
})
</script>

<template>
  <DropdownControl
    v-if="shouldShow && presetOptions.length > 0"
    v-model="selectedPreset"
    :label="label"
    icon="ri-file-settings-line"
    :options="presetOptions"
  />
</template>
