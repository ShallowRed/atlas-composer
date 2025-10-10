<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FormControl from '@/components/ui/FormControl.vue'
import { useConfigStore } from '@/stores/config'
import { useUIStore } from '@/stores/ui'

const { t } = useI18n()
const configStore = useConfigStore()
const uiStore = useUIStore()
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Graticule Toggle -->
    <FormControl
      v-model="uiStore.showGraticule"
      :label="t('settings.graticule')"
      icon="ri-grid-line"
      type="toggle"
    />

    <!-- Sphere Outline Toggle -->
    <FormControl
      v-model="uiStore.showSphere"
      :label="t('settings.sphere')"
      icon="ri-earth-line"
      type="toggle"
    />

    <!-- Composition Borders Toggle -->
    <FormControl
      v-show="configStore.viewMode === 'composite-custom' || configStore.viewMode === 'composite-existing'"
      v-model="uiStore.showCompositionBorders"
      :label="t('settings.compositionBorders')"
      icon="ri-shape-2-line"
      type="toggle"
    />

    <!-- Map Limits Toggle -->
    <FormControl
      v-model="uiStore.showMapLimits"
      :label="t('settings.mapLimits')"
      icon="ri-crop-line"
      type="toggle"
    />
  </div>
</template>
