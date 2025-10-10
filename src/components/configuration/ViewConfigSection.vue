<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FormControl from '@/components/ui/FormControl.vue'
import ProjectionParamsControls from '@/components/ui/ProjectionParamsControls.vue'
import ProjectionSelector from '@/components/ui/ProjectionSelector.vue'
import { useConfigStore } from '@/stores/config'

defineProps<Props>()
const { t } = useI18n()
const configStore = useConfigStore()

interface Props {
  compositeProjectionOptions: Array<{ value: string, label: string }>
  viewModeOptions: Array<{ value: string, label: string }>
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Main View Mode Selector -->
    <FormControl
      v-model="configStore.viewMode"
      :label="t('mode.view')"
      icon="ri-layout-grid-line"
      type="select"
      :disabled="configStore.isViewModeLocked"
      :options="viewModeOptions"
    />

    <!-- Composite Projection Selector (for composite-existing mode) -->
    <FormControl
      v-show="configStore.showCompositeProjectionSelector && compositeProjectionOptions.length > 0"
      v-model="configStore.compositeProjection"
      :label="t('projection.composite')"
      icon="ri-global-line"
      type="select"
      :options="compositeProjectionOptions"
    />

    <!-- Projection Mode Toggle (for split and composite-custom modes) -->
    <FormControl
      v-show="configStore.showProjectionModeToggle"
      v-model="configStore.projectionMode"
      :label="t('projection.mode')"
      icon="ri-global-line"
      type="select"
      :options="[
        { value: 'uniform', label: t('projection.uniform') },
        { value: 'individual', label: t('projection.individual') },
      ]"
    />

    <!-- Uniform Projection Selector (for uniform projection mode) -->
    <ProjectionSelector
      v-show="configStore.showProjectionSelector"
      v-model="configStore.selectedProjection"
      :label="t('projection.cartographic')"
      icon="ri-global-line"
      :projection-groups="configStore.projectionGroups"
      :recommendations="configStore.projectionRecommendations"
    />

    <!-- Scale Preservation (for split mode only) -->
    <FormControl
      v-show="configStore.showScalePreservation"
      v-model="configStore.scalePreservation"
      :label="t('territory.scalePreservation')"
      type="toggle"
    />

    <!-- Projection Parameters (for unified mode) -->
    <div v-if="configStore.viewMode === 'unified'" class="border-t border-base-300 pt-4">
      <ProjectionParamsControls />
    </div>
  </div>
</template>
