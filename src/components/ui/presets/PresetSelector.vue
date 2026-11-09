<script setup lang="ts">
import type { PresetApplicationError } from '@/core/types/errors'
import type { PresetId } from '@/types/branded'

import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import { useErrorMessage } from '@/composables/useErrorMessage'
import { resolveI18nValue } from '@/core/atlases/i18n-utils'
import { getAtlasPresets } from '@/core/atlases/registry'
import { useAtlasStore } from '@/stores/atlas'
import { useCompositionStore } from '@/stores/composition'
import { useViewStore } from '@/stores/view'
import { logger } from '@/utils/logger'

const debug = logger.vue.component
const { t, locale } = useI18n()
const { errorMessage } = useErrorMessage()
const atlasStore = useAtlasStore()
const viewStore = useViewStore()
const compositionStore = useCompositionStore()

const isLoading = ref(false)
const loadError = ref<PresetApplicationError | null>(null)
const selectedPreset = ref<PresetId | ''>('')

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

      const result = await compositionStore.loadPreset({
        presetId,
        skipValidation: false,
      })

      if (!result.ok) {
        loadError.value = result.error
        debug('Failed to load preset: %o', result.error)
        return
      }

      // The store drops a preset that arrives after a change of atlas or of view
      if (presetOptions.value.some(option => option.value === presetId)) {
        selectedPreset.value = presetId
      }

      debug('Successfully loaded preset: %s', presetId)
    }
    finally {
      isLoading.value = false
    }
  },
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
      return resolveI18nValue(presetName, locale.value)
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
      <span>{{ errorMessage(loadError) }}</span>
    </div>
  </div>
</template>
