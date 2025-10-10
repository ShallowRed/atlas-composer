<script setup lang="ts">
import type { CodeGenerationOptions } from '@/types/export-config'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { CompositeExportService } from '@/services/export/composite-export-service'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()

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

  const atlasConfig = configStore.currentAtlasConfig
  const compositeConfig = atlasConfig.compositeProjectionConfig
  if (!compositeConfig) {
    return '// No composite projection configuration available'
  }

  if (exportFormat.value === 'json') {
    const exported = CompositeExportService.exportToJSON(
      cartographer.customComposite as any,
      atlasConfig.id,
      atlasConfig.name,
      compositeConfig,
    )
    return JSON.stringify(exported, null, 2)
  }
  else {
    const exported = CompositeExportService.exportToJSON(
      cartographer.customComposite as any,
      atlasConfig.id,
      atlasConfig.name,
      compositeConfig,
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
  const atlasId = configStore.selectedAtlas || 'projection'
  return `${atlasId}-projection.${fileExtension.value}`
})

function close() {
  emit('update:modelValue', false)
}

function downloadFile() {
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
}

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(exportContent.value)
    // TODO: Show success toast notification
  }
  catch (error) {
    console.error('Failed to copy to clipboard:', error)
    // TODO: Show error toast notification
  }
}
</script>

<template>
  <dialog :open="modelValue" class="modal" @click.self="close">
    <div class="modal-box max-w-4xl">
      <!-- Header -->
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-bold">
          {{ t('export.title') }}
        </h3>
        <button class="btn btn-circle btn-ghost btn-sm" @click="close">
          ✕
        </button>
      </div>

      <!-- Export Format Selection -->
      <div class="mb-4">
        <label class="label">
          <span class="label-text">{{ t('export.formatLabel') }}</span>
        </label>
        <div class="join w-full">
          <button
            class="btn join-item flex-1"
            :class="{ 'btn-active': exportFormat === 'json' }"
            @click="exportFormat = 'json'"
          >
            {{ t('export.formatJson') }}
          </button>
          <button
            class="btn join-item flex-1"
            :class="{ 'btn-active': exportFormat === 'code' }"
            @click="exportFormat = 'code'"
          >
            {{ t('export.formatCode') }}
          </button>
        </div>
      </div>

      <!-- Code Options (shown when format is 'code') -->
      <div v-if="exportFormat === 'code'" class="mb-4 space-y-4">
        <!-- Target Library -->
        <div>
          <label class="label">
            <span class="label-text">{{ t('export.targetLibrary') }}</span>
          </label>
          <div class="join w-full">
            <button
              class="btn join-item flex-1"
              :class="{ 'btn-active': codeFormat === 'd3' }"
              @click="codeFormat = 'd3'"
            >
              D3.js
            </button>
            <button
              class="btn join-item flex-1"
              :class="{ 'btn-active': codeFormat === 'plot' }"
              @click="codeFormat = 'plot'"
            >
              Observable Plot
            </button>
          </div>
        </div>

        <!-- Language -->
        <div>
          <label class="label">
            <span class="label-text">{{ t('export.language') }}</span>
          </label>
          <div class="join w-full">
            <button
              class="btn join-item flex-1"
              :class="{ 'btn-active': codeLanguage === 'javascript' }"
              @click="codeLanguage = 'javascript'"
            >
              {{ t('export.javascript') }}
            </button>
            <button
              class="btn join-item flex-1"
              :class="{ 'btn-active': codeLanguage === 'typescript' }"
              @click="codeLanguage = 'typescript'"
            >
              {{ t('export.typescript') }}
            </button>
          </div>
        </div>

        <!-- Options -->
        <div class="flex gap-4">
          <label class="label flex cursor-pointer items-center gap-2">
            <input v-model="includeComments" type="checkbox" class="checkbox">
            <span class="label-text">{{ t('export.includeComments') }}</span>
          </label>
          <label class="label flex cursor-pointer items-center gap-2">
            <input v-model="includeExamples" type="checkbox" class="checkbox">
            <span class="label-text">{{ t('export.includeExamples') }}</span>
          </label>
        </div>
      </div>

      <!-- Preview -->
      <div class="mb-4">
        <label class="label">
          <span class="label-text">{{ t('export.preview') }}</span>
          <span class="label-text-alt">{{ fileName }}</span>
        </label>
        <div class="mockup-code max-h-96 overflow-auto">
          <pre class="px-6 py-4 text-xs"><code>{{ exportContent }}</code></pre>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-action">
        <button class="btn btn-ghost" @click="close">
          {{ t('actions.cancel') }}
        </button>
        <button class="btn btn-outline" @click="copyToClipboard">
          {{ t('export.copyToClipboard') }}
        </button>
        <button class="btn btn-primary" @click="downloadFile">
          {{ t('export.downloadFile') }}
        </button>
      </div>
    </div>
  </dialog>
</template>
