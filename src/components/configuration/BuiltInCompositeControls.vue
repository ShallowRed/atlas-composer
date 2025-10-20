<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import RangeSlider from '@/components/ui/forms/RangeSlider.vue'
import ViewPresetSelector from '@/components/ui/presets/ViewPresetSelector.vue'
import { useConfigStore } from '@/stores/config'

const { t } = useI18n()
const configStore = useConfigStore()

// Parameter ranges and steps
const RANGES = {
  scale: { min: 100, max: 5000, step: 50, default: 1000 },
}

const currentScale = computed(() => {
  return configStore.customScale ?? RANGES.scale.default
})

// Check if any parameters differ from defaults
const hasCustomParams = computed(() => {
  if (!configStore.currentViewPreset) {
    return configStore.customRotateLongitude !== null
      || configStore.customRotateLatitude !== null
      || configStore.customCenterLongitude !== null
      || configStore.customCenterLatitude !== null
      || configStore.customParallel1 !== null
      || configStore.customParallel2 !== null
  }

  return configStore.customRotateLongitude !== null
    || configStore.customRotateLatitude !== null
    || configStore.customCenterLongitude !== null
    || configStore.customCenterLatitude !== null
    || configStore.customParallel1 !== null
    || configStore.customParallel2 !== null
})

function updateScale(value: number) {
  configStore.setCustomScale(value)
}

function reset() {
  configStore.resetProjectionParams()
}
</script>

<template>
  <div>
    <!-- View Preset Selector -->
    <ViewPresetSelector />
    <div class="divider" />

    <!-- Reset Button -->
    <button
      class="btn btn-sm btn-soft w-full gap-1 mb-4"
      :disabled="!hasCustomParams"
      @click="reset"
    >
      <i class="ri-refresh-line" />
      {{ t('projectionParams.reset') }}
    </button>
    <!-- Scale (manual mode only) -->
    <RangeSlider
      :model-value="currentScale"
      label="Scale"
      icon="ri-zoom-in-line"
      size="xs"
      :min="RANGES.scale.min"
      :max="RANGES.scale.max"
      :step="RANGES.scale.step"
      @update:model-value="updateScale"
    />
  </div>
</template>
