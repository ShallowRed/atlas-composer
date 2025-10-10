<script setup lang="ts">
import type { ExportedCompositeConfig } from '@/types/export-config'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CompositeExportDialog from '@/components/ui/CompositeExportDialog.vue'
import FormControl from '@/components/ui/FormControl.vue'
import ImportModal from '@/components/ui/ImportModal.vue'
import ProjectionParamsControls from '@/components/ui/ProjectionParamsControls.vue'
import ProjectionSelector from '@/components/ui/ProjectionSelector.vue'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

defineProps<Props>()
const { t } = useI18n()
const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()

const showExportDialog = ref(false)
const showImportDialog = ref(false)

interface Props {
  compositeProjectionOptions: Array<{ value: string, label: string }>
  viewModeOptions: Array<{ value: string, label: string }>
}

function handleImported(_config: ExportedCompositeConfig) {
  // Configuration has been applied to stores by ImportModal
  // Just close the dialog and maybe show a success message
  showImportDialog.value = false
  // TODO: Add toast notification for success
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

    <!-- Import/Export Buttons (for composite-custom mode) -->
    <div
      v-if="configStore.viewMode === 'composite-custom'"
      class="flex gap-2"
    >
      <button
        class="btn btn-outline flex-1"
        @click="showImportDialog = true"
      >
        <i class="ri-upload-2-line" />
        {{ t('actions.import') }}
      </button>
      <button
        class="btn btn-outline flex-1"
        @click="showExportDialog = true"
      >
        <i class="ri-download-2-line" />
        {{ t('actions.export') }}
      </button>
    </div>

    <!-- Import Dialog -->
    <ImportModal
      :is-open="showImportDialog"
      :atlas-id="configStore.selectedAtlas"
      :composite-projection="geoDataStore.cartographer?.customComposite"
      @close="showImportDialog = false"
      @imported="handleImported"
    />

    <!-- Export Dialog -->
    <CompositeExportDialog v-model="showExportDialog" />
  </div>
</template>
