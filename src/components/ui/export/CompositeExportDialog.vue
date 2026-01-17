<script setup lang="ts">
import type { AtlasId } from '@/types/branded'
import type { CodeGenerationOptions } from '@/types/export-config'
import { computed, ref } from 'vue'

import { useI18n } from 'vue-i18n'
import ButtonGroup from '@/components/ui/primitives/ButtonGroup.vue'
import LabelWithIcon from '@/components/ui/primitives/LabelWithIcon.vue'
import Modal from '@/components/ui/primitives/Modal.vue'
import { useParameterProvider } from '@/composables/useParameterProvider'
import { CompositeExportService } from '@/services/export/composite-export-service'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useProjectionStore } from '@/stores/projection'
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
const projectionStore = useProjectionStore()
const geoDataStore = useGeoDataStore()
const uiStore = useUIStore()
const { parameterProvider } = useParameterProvider()

// Export options
const exportFormat = ref<'json' | 'code'>('json')
const codeFormat = ref<'d3' | 'plot'>('d3')
const codeLanguage = ref<'javascript' | 'typescript'>('javascript')
const includeComments = ref(true)
const includeExamples = ref(true)

// Generated content
const exportContent = computed(() => {
  const cartographer = geoDataStore.cartographer
  if (!cartographer?.customComposite) {
    return '// No custom composite projection available'
  }

  const atlasConfig = atlasStore.currentAtlasConfig
  const compositeConfig = atlasConfig?.compositeProjectionConfig
  if (!compositeConfig || !atlasConfig) {
    return '// No composite projection configuration available'
  }

  if (exportFormat.value === 'json') {
    // Convert: atlasConfig.id is loaded from JSON, needs to be branded AtlasId
    const exported = CompositeExportService.exportToJSON(
      cartographer.customComposite as any,
      atlasConfig.id as AtlasId,
      atlasConfig.name,
      parameterProvider,
      projectionStore.referenceScale,
      projectionStore.canvasDimensions,
    )
    return JSON.stringify(exported, null, 2)
  }
  else {
    // Convert: atlasConfig.id is loaded from JSON, needs to be branded AtlasId
    const exported = CompositeExportService.exportToJSON(
      cartographer.customComposite as any,
      atlasConfig.id as AtlasId,
      atlasConfig.name,
      parameterProvider,
      projectionStore.referenceScale,
      projectionStore.canvasDimensions,
    )

    const options: CodeGenerationOptions = {
      format: codeFormat.value,
      language: codeLanguage.value,
      includeComments: includeComments.value,
      includeExamples: includeExamples.value,
    }

    return CompositeExportService.generateCode(exported, options)
  }
})

const fileExtension = computed(() => {
  if (exportFormat.value === 'json') {
    return 'json'
  }
  else if (codeLanguage.value === 'typescript') {
    return 'ts'
  }
  else {
    return 'js'
  }
})

const fileName = computed(() => {
  const atlasId = atlasStore.selectedAtlasId || 'projection'
  return `${atlasId}-projection.${fileExtension.value}`
})

function close() {
  emit('update:modelValue', false)
}

function downloadFile() {
  try {
    const content = exportContent.value
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
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
    <!-- Export Format Selection -->
    <div class="mb-4">
      <LabelWithIcon
        size="sm"
        icon="ri-file-list-3-line"
      >
        {{ t('export.formatLabel') }}
      </LabelWithIcon>
      <ButtonGroup
        v-model="exportFormat"
        :options="[
          { value: 'json', label: t('export.formatJson') },
          { value: 'code', label: t('export.formatCode') },
        ]"
        full-width
      />
    </div>

    <!-- Code Options (shown when format is 'code') -->
    <div
      v-if="exportFormat === 'code'"
      class="mb-4 space-y-4"
    >
      <!-- Target Library -->
      <div>
        <LabelWithIcon
          size="sm"
          icon="ri-code-line"
        >
          {{ t('export.targetLibrary') }}
        </LabelWithIcon>
        <ButtonGroup
          v-model="codeFormat"
          :options="[
            { value: 'd3', label: 'D3.js' },
            { value: 'plot', label: 'Observable Plot' },
          ]"
          full-width
        />
      </div>

      <!-- Language -->
      <div>
        <LabelWithIcon
          size="sm"
          icon="ri-code-line"
        >
          {{ t('export.language') }}
        </LabelWithIcon>
        <ButtonGroup
          v-model="codeLanguage"
          :options="[
            { value: 'javascript', label: t('export.javascript') },
            { value: 'typescript', label: t('export.typescript') },
          ]"
          full-width
        />
      </div>

      <!-- Options -->
      <LabelWithIcon
        size="sm"
        icon="ri-settings-3-line"
      >
        {{ t('export.options') }}
      </LabelWithIcon>
      <div class="flex gap-4">
        <label class="label flex cursor-pointer items-center gap-2">
          <input
            v-model="includeComments"
            type="checkbox"
            class="toggle toggle-sm"
          >
          <span class="label-text text-sm">{{ t('export.includeComments') }}</span>
        </label>
        <label class="label flex cursor-pointer items-center gap-2">
          <input
            v-model="includeExamples"
            type="checkbox"
            class="toggle toggle-sm"
          >
          <span class="label-text text-sm">{{ t('export.includeExamples') }}</span>
        </label>
      </div>
    </div>

    <!-- Preview -->
    <div class="mb-4 flex flex-col">
      <div class="label">
        <LabelWithIcon
          size="sm"
          icon="ri-eye-line"
        >
          {{ t('export.preview') }}
        </LabelWithIcon>
      </div>
      <p class="badge mb-2">
        {{ fileName }}
      </p>
      <div class="mockup-code max-h-96 overflow-auto">
        <pre class="px-6 py-4 text-xs"><code>{{ exportContent }}</code></pre>
      </div>
    </div>

    <!-- Actions -->
    <template #actions>
      <button
        class="btn btn-ghost flex gap-2"
        @click="close"
      >
        {{ t('actions.cancel') }}
        <i class="ri-close-line" />
      </button>
      <button
        class="btn btn-outline flex gap-2"
        @click="copyToClipboard"
      >
        {{ t('export.copyToClipboard') }}
        <i class="ri-file-copy-line" />
      </button>
      <button
        class="btn btn-primary flex gap-2"
        @click="downloadFile"
      >
        {{ t('export.downloadFile') }}
        <i class="ri-download-line" />
      </button>
    </template>
  </Modal>
</template>
