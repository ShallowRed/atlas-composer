<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import RangeSlider from '@/components/ui/forms/RangeSlider.vue'
import { useConfigStore } from '@/stores/config'

const { t } = useI18n()
const configStore = useConfigStore()

// Parameter ranges and steps for composite projection settings
const RANGES = {
  scale: { min: 1000, max: 5000, step: 100, default: 2700 },
  width: { min: 400, max: 1600, step: 50, default: 800 },
  height: { min: 300, max: 1200, step: 50, default: 600 },
}

// Get current values or defaults
const currentScale = computed(() => {
  return configStore.customCompositeScale ?? RANGES.scale.default
})

const currentWidth = computed(() => {
  return configStore.customCompositeWidth ?? RANGES.width.default
})

const currentHeight = computed(() => {
  return configStore.customCompositeHeight ?? RANGES.height.default
})

// Check if any custom parameters are set
const hasCustomParams = computed(() => {
  return configStore.customCompositeScale !== null
    || configStore.customCompositeWidth !== null
    || configStore.customCompositeHeight !== null
})

// Update functions
function updateScale(value: number) {
  configStore.setCustomCompositeScale(value)
}

function updateWidth(value: number) {
  configStore.setCustomCompositeWidth(value)
}

function updateHeight(value: number) {
  configStore.setCustomCompositeHeight(value)
}

function reset() {
  configStore.resetCompositeParams()
}
</script>

<template>
  <div>
    <div class="divider" />
    <!-- Header with reset button -->
    <h3 class="card-title">
      <i class="ri-settings-3-line" />
      {{ t('compositeParams.title') }}
    </h3>
    <p class="text-sm opacity-70 mb-4">
      {{ t('compositeParams.info') }}
    </p>
    <div class="flex flex-col gap-4 pt-2">
      <button
        class="btn btn-sm btn-soft w-full gap-1 mb-4"
        :disabled="!hasCustomParams"
        @click="reset"
      >
        <i class="ri-refresh-line" />
        {{ t('compositeParams.reset') }}
      </button>

      <!-- Main Scale Factor -->
      <RangeSlider
        :model-value="currentScale"
        :label="t('compositeParams.scale')"
        icon="ri-focus-3-line"
        size="xs"
        :min="RANGES.scale.min"
        :max="RANGES.scale.max"
        :step="RANGES.scale.step"
        @update:model-value="updateScale"
      />

      <!-- Map Width -->
      <RangeSlider
        :model-value="currentWidth"
        :label="t('compositeParams.width')"
        icon="ri-arrow-left-right-line"
        size="xs"
        :min="RANGES.width.min"
        :max="RANGES.width.max"
        :step="RANGES.width.step"
        unit="px"
        color="secondary"
        @update:model-value="updateWidth"
      />

      <!-- Map Height -->
      <RangeSlider
        :model-value="currentHeight"
        :label="t('compositeParams.height')"
        icon="ri-arrow-up-down-line"
        size="xs"
        :min="RANGES.height.min"
        :max="RANGES.height.max"
        :step="RANGES.height.step"
        unit="px"
        color="accent"
        @update:model-value="updateHeight"
      />
    </div>
  </div>
</template>
