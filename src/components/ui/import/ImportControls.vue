<script setup lang="ts">
import type { ExportedCompositeConfig } from '@/types/export-config'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CompositeExportDialog from '@/components/ui/export/CompositeExportDialog.vue'
import ImportModal from '@/components/ui/import/ImportModal.vue'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useViewStore } from '@/stores/view'

const { t } = useI18n()
const atlasStore = useAtlasStore()
const viewStore = useViewStore()
const geoDataStore = useGeoDataStore()

const showExportDialog = ref(false)
const showImportDialog = ref(false)

function handleImported(_config: ExportedCompositeConfig) {
  showImportDialog.value = false
}
</script>

<template>
  <div
    v-if="viewStore.viewMode === 'composite-custom'"
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
    :atlas-id="atlasStore.selectedAtlasId"
    :composite-projection="geoDataStore.cartographer?.customComposite"
    @imported="handleImported"
  />

  <!-- Export Dialog -->
  <CompositeExportDialog v-model="showExportDialog" />
</template>
