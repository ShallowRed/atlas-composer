<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useConfigStore } from '../stores/config'
import {
  clientParamsToProjectionConfig,
  createCustomCompositeProjection,
  exportConfigAsJSON,
  generateProjectionCode,
} from '../utils/projectionExporter'

// Notification state
const notification = ref<{ type: 'success' | 'error', message: string } | null>(null)

const configStore = useConfigStore()
const { territoryTranslations, territoryScales } = storeToRefs(configStore)

// Format d'export sélectionné
const exportFormat = ref<'typescript' | 'json'>('typescript')

// Modal visible
const isModalOpen = ref(false)

// Générer la configuration de projection
const projectionConfig = computed(() => {
  return clientParamsToProjectionConfig(
    territoryTranslations.value,
    territoryScales.value,
  )
})

// Générer le code d'export
const exportCode = computed(() => {
  if (exportFormat.value === 'typescript') {
    return generateProjectionCode(projectionConfig.value)
  }
  else {
    return exportConfigAsJSON(projectionConfig.value)
  }
})

// Créer l'instance de projection pour tester
const customProjection = computed(() => {
  return createCustomCompositeProjection(projectionConfig.value)
})

// Actions
function openExportModal() {
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
}

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(exportCode.value)
    notification.value = { type: 'success', message: 'Code copié dans le presse-papier!' }
    setTimeout(() => {
      notification.value = null
    }, 3000)
  }
  catch (error) {
    console.error('Erreur lors de la copie:', error)
    notification.value = { type: 'error', message: 'Erreur lors de la copie' }
    setTimeout(() => {
      notification.value = null
    }, 3000)
  }
}

function downloadFile() {
  const extension = exportFormat.value === 'typescript' ? 'ts' : 'json'
  const filename = `custom-projection.${extension}`
  const blob = new Blob([exportCode.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Exposer la projection pour utilisation externe
defineExpose({
  customProjection,
  openExportModal,
})
</script>

<template>
  <div class="projection-exporter">
    <button
      class="btn btn-primary w-full"
      @click="openExportModal"
    >
      🗺️ Exporter la projection
    </button>

    <!-- Toast notification -->
    <div
      v-if="notification"
      class="toast toast-top toast-end"
    >
      <div
        class="alert"
        :class="notification.type === 'success' ? 'alert-success' : 'alert-error'"
      >
        <span>{{ notification.message }}</span>
      </div>
    </div>

    <!-- Modal d'export -->
    <div
      v-if="isModalOpen"
      class="modal-overlay"
      @click="closeModal"
    >
      <div
        class="modal-content bg-base-100 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh]"
        @click.stop
      >
        <header class="modal-header flex items-center justify-between p-4 border-b border-base-300">
          <h2 class="modal-title text-xl font-bold">
            Exporter la projection personnalisée
          </h2>
          <button
            class="btn btn-sm btn-circle btn-ghost"
            @click="closeModal"
          >
            ✕
          </button>
        </header>

        <div class="modal-body p-4 overflow-auto flex-1 space-y-4">
          <!-- Sélection du format -->
          <div class="format-selector flex gap-4">
            <label class="format-label flex items-center gap-2 cursor-pointer">
              <input
                v-model="exportFormat"
                type="radio"
                value="typescript"
                class="radio radio-primary"
              >
              <span>TypeScript (.ts)</span>
            </label>
            <label class="format-label flex items-center gap-2 cursor-pointer">
              <input
                v-model="exportFormat"
                type="radio"
                value="json"
                class="radio radio-primary"
              >
              <span>JSON Config (.json)</span>
            </label>
          </div>

          <!-- Aperçu du code -->
          <div class="code-preview bg-base-200 rounded-lg p-4 overflow-auto max-h-96">
            <pre class="m-0"><code class="text-sm font-mono">{{ exportCode }}</code></pre>
          </div>

          <!-- Actions -->
          <div class="modal-actions flex gap-2 justify-end">
            <button
              class="btn btn-secondary"
              @click="copyToClipboard"
            >
              📋 Copier
            </button>
            <button
              class="btn btn-success"
              @click="downloadFile"
            >
              💾 Télécharger
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.projection-exporter {
  @apply w-full;
}

.modal-overlay {
  @apply fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4;
}

.modal-content {
  @apply flex flex-col;
}
</style>
