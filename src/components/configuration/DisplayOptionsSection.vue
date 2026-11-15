<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import ToggleControl from '@/components/ui/forms/ToggleControl.vue'
import { useViewState } from '@/composables/useViewState'
import { BASEMAP_SOURCES } from '@/core/basemap'
import { useProjectionStore } from '@/stores/projection'
import { useUIStore } from '@/stores/ui'

const { t } = useI18n()
const projectionStore = useProjectionStore()
const uiStore = useUIStore()
const { viewOrchestration } = useViewState()

const basemapOptions = computed(() => BASEMAP_SOURCES.map(source => ({ value: source, label: t(`basemap.sources.${source}`) })))
</script>

<template>
  <div class="flex flex-wrap gap-x-6 gap-y-1">
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
    <!-- Graticule Toggle -->
    <ToggleControl
      v-model="uiStore.showGraticule"
      :label="t('settings.graticule')"
      icon="ri-grid-line"
    />
    <DropdownControl
      v-model="uiStore.basemap"
      inline
      size="sm"
      :label="t('basemap.label')"
      icon="ri-landscape-line"
      :options="basemapOptions"
      :show-selected-icon="false"
    />
    <!-- Globe outline automatically shown in unified mode -->
    <!-- Scale Preservation Toggle -->
    <ToggleControl
      v-show="viewOrchestration.shouldShowScalePreservationToggle.value"
      v-model="projectionStore.scalePreservation"
      :label="t('territory.scalePreservation')"
    />
  </div>
</template>
