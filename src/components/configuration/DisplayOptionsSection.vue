<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ToggleControl from '@/components/ui/forms/ToggleControl.vue'
import { useConfigStore } from '@/stores/config'
import { useUIStore } from '@/stores/ui'

const { t } = useI18n()
const configStore = useConfigStore()
const uiStore = useUIStore()
</script>

<template>
  <div class="grid grid-cols-2 gap-2">
    <!-- Graticule Toggle -->
    <ToggleControl
      v-model="uiStore.showGraticule"
      :label="t('settings.graticule')"
      icon="ri-grid-line"
    />

    <!-- Sphere Outline Toggle -->
    <ToggleControl
      v-model="uiStore.showSphere"
      :label="t('settings.sphere')"
      icon="ri-earth-line"
    />

    <!-- Composition Borders Toggle -->
    <ToggleControl
      v-show="configStore.viewMode === 'composite-custom' || configStore.viewMode === 'composite-existing'"
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

    <!-- Scale Preservation Toggle -->
    <ToggleControl
      v-show="configStore.showScalePreservation"
      v-model="configStore.scalePreservation"
      :label="t('territory.scalePreservation')"
    />
  </div>
</template>
