<script setup lang="ts">
import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { ImportError } from '@/core/types/errors'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import Alert from '@/components/ui/primitives/Alert.vue'
import Modal from '@/components/ui/primitives/Modal.vue'
import { useErrorMessage } from '@/composables/useErrorMessage'
import { useCompositionStore } from '@/stores/composition'
import { useGeoDataStore } from '@/stores/geoData'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'imported': [config: CompositeProjectionConfig]
}>()

const { t, locale } = useI18n()
const compositionStore = useCompositionStore()
const geoDataStore = useGeoDataStore()
const { errorMessages } = useErrorMessage()

const isDragging = ref(false)
const isProcessing = ref(false)
const selectedFile = ref<File | null>(null)
const importError = ref<ImportError | null>(null)
const importedConfig = ref<CompositeProjectionConfig | null>(null)

const canApply = computed(() => importedConfig.value && !importError.value && geoDataStore.canImport)

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    const file = input.files[0]
    if (file) {
      processFile(file)
    }
  }
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

async function processFile(file: File) {
  isProcessing.value = true
  selectedFile.value = file
  importError.value = null
  importedConfig.value = null

  try {
    const result = await compositionStore.readConfigurationFile(file)
    if (result.ok) {
      importedConfig.value = result.value
    }
    else {
      importError.value = result.error
    }
  }
  finally {
    isProcessing.value = false
  }
}

async function applyImport() {
  if (!canApply.value || !importedConfig.value) {
    return
  }

  const result = await compositionStore.importConfiguration(importedConfig.value)

  if (!result.ok) {
    importError.value = result.error
    return
  }

  emit('imported', importedConfig.value)
  handleClose()
}

function handleClose() {
  clearFile()
  isDragging.value = false
  isProcessing.value = false

  emit('update:modelValue', false)
}

function clearFile() {
  selectedFile.value = null
  importError.value = null
  importedConfig.value = null
}
</script>

<template>
  <Modal
    :model-value="modelValue"
    :title="t('import.title')"
    max-width="2xl"
    @update:model-value="handleClose"
  >
    <!-- Description -->
    <p class="text-sm text-base-content/70 mb-6">
      {{ t('import.description') }}
    </p>

    <!-- File Upload Area -->
    <div
      v-if="!selectedFile"
      class="border-2 border-dashed rounded-lg p-8 text-center transition-colors"
      :class="isDragging ? 'border-primary bg-primary/10' : 'border-base-300'"
      @drop.prevent="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
    >
      <div class="flex flex-row items-center justify-center gap-2 mb-4">
        <i class="ri-file-upload-line text-3xl" />
        <p class="text-lg font-medium">
          {{ t('import.dropHint') }}
        </p>
      </div>
      <p class="text-sm text-base-content/70 mb-4">
        {{ t('import.or') }}
      </p>
      <label class="btn btn-primary btn-soft btn-wide">
        <i class="ri-folder-3-line" />
        {{ t('import.chooseFile') }}
        <input
          type="file"
          accept=".json"
          class="hidden"
          @change="handleFileSelect"
        >
      </label>
    </div>

    <!-- Selected File Info -->
    <Alert
      v-else-if="!isProcessing"
      type="info"
      icon="ri-file-3-line"
      class="mb-4"
    >
      <div class="flex items-center gap-2">
        <span class="font-medium">{{ selectedFile.name }}</span>
        <span class="flex-1 text-sm text-base-content/70">
          ({{ (selectedFile.size / 1024).toFixed(2) }} KB)
        </span>
        <button
          class="btn btn-sm btn-ghost"
          @click="clearFile"
        >
          <i class="ri-close-line" />
          {{ t('import.removeFile') }}
        </button>
      </div>
    </Alert>

    <!-- Processing -->
    <div
      v-if="isProcessing"
      class="flex items-center justify-center py-8"
    >
      <div class="loading loading-spinner loading-lg text-primary" />
      <span class="ml-4">{{ t('import.processing') }}</span>
    </div>

    <!-- Validation Results -->
    <div v-if="(importError || importedConfig) && !isProcessing">
      <!-- Success -->
      <Alert
        v-if="!importError"
        type="success"
        icon="ri-check-line"
        class="my-4"
      >
        {{ t('import.valid') }}
      </Alert>

      <!-- Errors -->
      <Alert
        v-if="importError"
        type="error"
        class="mb-4"
      >
        <h3 class="font-bold">
          {{ t('import.errorsTitle') }}
        </h3>
        <ul class="list-disc list-inside text-sm mt-1">
          <li
            v-for="(message, index) in errorMessages(importError)"
            :key="index"
          >
            {{ message }}
          </li>
        </ul>
      </Alert>

      <!-- Configuration Preview -->
      <div
        v-if="importedConfig"
        class="border border-base-300 rounded-lg p-4 mb-4"
      >
        <h3 class="font-bold mb-2">
          {{ t('import.detailsTitle') }}
        </h3>
        <dl class="grid grid-cols-2 gap-2 text-sm">
          <dt class="text-base-content/70">
            {{ t('import.atlas') }}
          </dt>
          <dd class="font-medium">
            {{ importedConfig.metadata.atlasName }}
          </dd>
          <dt class="text-base-content/70">
            {{ t('import.territories') }}
          </dt>
          <dd class="font-medium">
            {{ importedConfig.territories.length }}
          </dd>
          <template v-if="importedConfig.metadata.exportDate">
            <dt class="text-base-content/70">
              {{ t('import.exportDate') }}
            </dt>
            <dd class="font-medium">
              {{ new Date(importedConfig.metadata.exportDate).toLocaleString(locale) }}
            </dd>
          </template>
        </dl>
      </div>
    </div>

    <!-- Actions -->
    <template #actions>
      <button
        class="btn btn-primary btn-outline"
        @click="handleClose"
      >
        <i class="ri-close-line" />
        {{ t('common.cancel') }}
      </button>
      <button
        class="btn btn-primary"
        :disabled="!canApply"
        @click="applyImport"
      >
        <i class="ri-check-line" />
        {{ t('import.apply') }}
      </button>
    </template>
  </Modal>
</template>
