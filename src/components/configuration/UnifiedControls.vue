<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import RangeSlider from '@/components/ui/forms/RangeSlider.vue'
import ViewPresetSelector from '@/components/ui/presets/ViewPresetSelector.vue'
import ProjectionParamsControls from '@/components/ui/projections/ProjectionParamsControls.vue'
import { useParameterStore } from '@/stores/parameters'

const { t } = useI18n()
const parameterStore = useParameterStore()

// Zoom controls - using global parameters for unified mode
const zoomLevel = computed({
  get: () => (parameterStore.globalParameters.zoomLevel as number) ?? 1.0,
  set: (value: number) => parameterStore.setGlobalParameter('zoomLevel', value),
})
</script>

<template>
  <div>
    <ViewPresetSelector />

    <div class="divider" />

    <ProjectionParamsControls />

    <div class="divider" />

    <!-- Zoom Controls -->
    <div class="space-y-4">
      <h3 class="text-sm font-semibold flex items-center gap-2">
        <i class="ri-zoom-in-line" />
        {{ t('projectionParams.zoom') }}
      </h3>

      <RangeSlider
        v-model="zoomLevel"
        :label="t('projectionParams.zoomLevel')"
        icon="ri-zoom-in-line"
        size="xs"
        :min="0.5"
        :max="10"
        :step="0.1"
        unit="×"
      />
    </div>
  </div>
</template>
