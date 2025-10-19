<script setup lang="ts">
import type { ExportedCompositeConfig } from '@/types/export-config'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CompositeExportDialog from '@/components/ui/export/CompositeExportDialog.vue'
import ImportModal from '@/components/ui/import/ImportModal.vue'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

const { t } = useI18n()
const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()

const showExportDialog = ref(false)
const showImportDialog = ref(false)

function handleImported(_config: ExportedCompositeConfig) {
  // Configuration has been applied to stores by ImportModal
  showImportDialog.value = false
}
</script>

<template>
  <!-- Import/Export Buttons (for composite-custom mode) -->
  <div
    v-if="configStore.viewMode === 'composite-custom'"
    class="join w-full"
  >
    <button
      class="btn btn-soft btn-sm join-item flex-1"
      @click="showImportDialog = true"
    >
      <i class="ri-upload-2-line" />
      {{ t('actions.import') }}
    </button>
    <button
      class="btn btn-soft btn-sm join-item flex-1"
      @click="showExportDialog = true"
    >
      <i class="ri-download-2-line" />
      {{ t('actions.export') }}
    </button>
  </div>

  <!-- Import Dialog -->
  <ImportModal
    v-model="showImportDialog"
    :atlas-id="configStore.selectedAtlas"
    :composite-projection="geoDataStore.cartographer?.customComposite"
    @imported="handleImported"
  />

  <!-- Export Dialog -->
  <CompositeExportDialog v-model="showExportDialog" />
</template>
