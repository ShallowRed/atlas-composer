<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ToggleControl from '@/components/ui/forms/ToggleControl.vue'
import { useViewState } from '@/composables/useViewState'
import { useConfigStore } from '@/stores/config'
import { useUIStore } from '@/stores/ui'

const { t } = useI18n()
const configStore = useConfigStore()
const uiStore = useUIStore()
const { viewOrchestration } = useViewState()
</script>

<template>
  <div class="grid grid-cols-2 gap-2">
    <div class="space-y-2">
      <!-- Composition Borders Toggle -->
      <ToggleControl
        v-show="viewOrchestration.shouldShowCompositionBordersToggle.value"
        v-model="uiStore.showCompositionBorders"
        :label="t('settings.compositionBorders')"
        icon="ri-shape-2-line"
      />
      <!-- Map Limits Toggle -->
      <ToggleControl
        v-model="uiStore.showMapLimits"
        :label="t('settings.mapLimits')"
        icon="ri-crop-line"
      />
    </div>
    <div class="space-y-2">
      <!-- Graticule Toggle -->
      <ToggleControl
        v-model="uiStore.showGraticule"
        :label="t('settings.graticule')"
        icon="ri-grid-line"
      />
      <!-- Globe outline automatically shown in unified mode -->
    </div>
    <div class="space-y-2">
      <!-- Scale Preservation Toggle -->
      <ToggleControl
        v-show="viewOrchestration.shouldShowScalePreservationToggle.value"
        v-model="configStore.scalePreservation"
        :label="t('territory.scalePreservation')"
      />
    </div>
  </div>
</template>
