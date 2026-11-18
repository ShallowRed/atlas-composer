<script setup lang="ts">
import type { GeoDataError, PresetApplicationError } from '@/core/types/errors'
import type { PresetId } from '@/types/branded'

import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import Alert from '@/components/ui/primitives/Alert.vue'
import { useErrorMessage } from '@/composables/useErrorMessage'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { getAtlasPresets } from '@/core/atlases/registry'
import { useAtlasStore } from '@/stores/atlas'
import { useCompositionStore } from '@/stores/composition'
import { useViewStore } from '@/stores/view'
import { logger } from '@/utils/logger'

const debug = logger.vue.component
const { t } = useI18n()
const { localize } = useLocalizedName()
const { errorMessage } = useErrorMessage()
const atlasStore = useAtlasStore()
const viewStore = useViewStore()
const compositionStore = useCompositionStore()

// The entry that draws every territory at its geographic position, outside the presets of the registry
const GEOGRAPHIC_START = 'geographic-start'

const isLoading = ref(false)
const loadError = ref<PresetApplicationError | GeoDataError | null>(null)
const selectedPreset = ref<PresetId | ''>('')

const presetOptions = computed(() => {
  const atlasId = atlasStore.selectedAtlasId
  const viewMode = viewStore.viewMode
  if (!atlasId || !viewMode)
    return []

  const presets = getAtlasPresets(atlasId)

  const filteredPresets = presets.filter(preset => preset.type === viewMode)

  const options = filteredPresets.map((preset) => {
    return {
      value: preset.id as string,
      label: localize(preset.name),
    }
  })

  return viewMode === 'composite-custom'
    ? [{ value: GEOGRAPHIC_START, label: t('presets.geographic'), icon: 'ri-earth-line' }, ...options]
    : options
})

const currentPreset = computed({
  get: () => {
    const atlasId = atlasStore.selectedAtlasId
    const viewMode = viewStore.viewMode
    if (!atlasId || !viewMode)
      return ''
    if (compositionStore.isGeographicComposition)
      return GEOGRAPHIC_START

    const presets = getAtlasPresets(atlasId)
    const viewModePresets = presets.filter(p => p.type === viewMode)
    const defaultPreset = viewModePresets.find(p => p.isDefault) || viewModePresets[0]

    return selectedPreset.value || defaultPreset?.id || ''
  },
  set: async (value: string) => {
    if (!value || isLoading.value)
      return

    isLoading.value = true
    loadError.value = null

    if (value === GEOGRAPHIC_START) {
      const result = await compositionStore.startGeographicComposition()
      if (!result.ok) {
        loadError.value = result.error
      }
      selectedPreset.value = ''
      isLoading.value = false
      return
    }

    const presetId = value as PresetId

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

    <Alert
      v-if="loadError"
      type="error"
      size="xs"
    >
      {{ errorMessage(loadError) }}
    </Alert>
  </div>
</template>
