<script setup lang="ts">
import { computed, ref } from 'vue'

import { useI18n } from 'vue-i18n'
import LabelWithIcon from '@/components/ui/primitives/LabelWithIcon.vue'
import Modal from '@/components/ui/primitives/Modal.vue'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useUIStore } from '@/stores/ui'
import { logger } from '@/utils/logger'

defineProps<Props>()

const emit = defineEmits<Emits>()

const debug = logger.vue.component

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const { t } = useI18n()

const atlasStore = useAtlasStore()
const geoDataStore = useGeoDataStore()
const uiStore = useUIStore()

const showPreview = ref(false)

const exportContent = computed(() => {
  try {
    return JSON.stringify(geoDataStore.exportConfiguration(), null, 2)
  }
  catch (error) {
    return `// ${error instanceof Error ? error.message : String(error)}`
  }
})

const fileName = computed(() => {
  const atlasId = atlasStore.selectedAtlasId || 'projection'
  return `${atlasId}-projection.json`
})

function close() {
  emit('update:modelValue', false)
}

function downloadFile() {
  try {
    const content = exportContent.value
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName.value
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    downloadSuccess()
  }
  catch (error) {
    debug('Failed to download file: %o', error)
    uiStore.showToast(t('export.downloadError'), 'error')
  }
}

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(exportContent.value)
    uiStore.showToast(t('export.copySuccess'), 'success')
  }
  catch (error) {
    debug('Failed to copy to clipboard: %o', error)
    uiStore.showToast(t('export.copyError'), 'error')
  }
}

function downloadSuccess() {
  uiStore.showToast(t('export.downloadSuccess'), 'success')
}
</script>

<template>
  <Modal
    :model-value="modelValue"
    :title="t('export.title')"
    icon="ri-file-download-line"
    max-width="2xl"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <!-- JSON Export Block -->
    <div class="rounded-box border border-base-300 bg-base-200/50 p-4 mb-4">
      <!-- File info -->
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <i class="ri-file-code-line text-lg text-primary" />
          <span class="font-medium">{{ fileName }}</span>
        </div>
      </div>

      <p class="text-sm text-base-content/70">
        {{ t('export.jsonDescription') }}
      </p>
      <!-- Action buttons -->
      <div class="flex gap-2 mt-4 justify-stretch items-stretch">
        <button
          class="btn btn-sm btn-outline gap-1 flex-1"
          @click="showPreview = !showPreview"
        >
          <i :class="showPreview ? 'ri-eye-off-line' : 'ri-eye-line'" />
          {{ showPreview ? t('export.hidePreview') : t('export.showPreview') }}
        </button>
        <button
          class="btn btn-sm btn-outline gap-1 flex-1"
          @click="copyToClipboard"
        >
          <i class="ri-file-copy-line" />
          {{ t('export.copyToClipboard') }}
        </button>
        <button
          class="btn btn-sm btn-outline btn-primary gap-1 flex-1"
          @click="downloadFile"
        >
          <i class="ri-download-line" />
          {{ t('export.downloadFile') }}
        </button>
      </div>
      <!-- Preview (collapsible) -->
      <div
        v-if="showPreview"
        class="mt-3"
      >
        <div class="mockup-code max-h-72 overflow-auto">
          <pre class="px-6 py-4 text-xs"><code>{{ exportContent }}</code></pre>
        </div>
      </div>
    </div>

    <!-- Usage documentation section -->
    <div>
      <LabelWithIcon
        size="sm"
        icon="ri-book-open-line"
      >
        {{ t('export.howToUse') }}
      </LabelWithIcon>
      <p class="text-sm text-base-content/70 mb-3">
        {{ t('export.usageDescription') }}
      </p>

      <!-- Documentation links -->
      <div class="flex flex-col gap-2">
        <a
          href="https://www.npmjs.com/package/@atlas-composer/projection-loader"
          target="_blank"
          rel="noopener noreferrer"
          class="link link-primary gap-2 justify-start"
        >
          <i class="ri-npmjs-line text-lg" />
          {{ t('export.npmPackage') }}
          <i class="ri-external-link-line ml-auto" />
        </a>
        <a
          href="https://observablehq.com/@shallowred/atlas-composer"
          target="_blank"
          rel="noopener noreferrer"
          class="link link-primary gap-2 justify-start"
        >
          <i class="ri-line-chart-line text-lg" />
          {{ t('export.observableNotebook') }}
          <i class="ri-external-link-line ml-auto" />
        </a>
      </div>
    </div>

    <!-- Actions -->
    <template #actions>
      <button
        class="btn btn-ghost gap-2"
        @click="close"
      >
        {{ t('actions.close') }}
      </button>
    </template>
  </Modal>
</template>
