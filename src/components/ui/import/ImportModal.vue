<script setup lang="ts">
import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { ImportError } from '@/core/types/errors'
import { computed, ref } from 'vue'

import Modal from '@/components/ui/primitives/Modal.vue'
import { useErrorMessage } from '@/composables/useErrorMessage'
import { useCompositionStore } from '@/stores/composition'

const props = defineProps<{
  modelValue: boolean
  compositeProjection: any
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'imported': [config: CompositeProjectionConfig]
}>()

const compositionStore = useCompositionStore()
const { errorMessages } = useErrorMessage()

const isDragging = ref(false)
const isProcessing = ref(false)
const selectedFile = ref<File | null>(null)
const importError = ref<ImportError | null>(null)
const importedConfig = ref<CompositeProjectionConfig | null>(null)

const canApply = computed(() =>
  importedConfig.value
  && !importError.value
  && props.compositeProjection !== null
  && props.compositeProjection !== undefined,
)

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
    title="Import Configuration"
    max-width="2xl"
    @update:model-value="handleClose"
  >
    <!-- Description -->
    <p class="text-sm text-base-content/70 mb-6">
      Import a previously exported composite projection configuration.
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
          Drag and drop a JSON file here
        </p>
      </div>
      <p class="text-sm text-base-content/70 mb-4">
        or
      </p>
      <label class="btn btn-primary btn-soft btn-wide">
        <i class="ri-folder-3-line" />
        Choose File
        <input
          type="file"
          accept=".json"
          class="hidden"
          @change="handleFileSelect"
        >
      </label>
    </div>

    <!-- Selected File Info -->
    <div
      v-else-if="!isProcessing"
      class="alert alert-info alert-soft mb-4 flex items-center justify-between"
    >
      <div class="flex items-center gap-2 flex-1">
        <i class="ri-file-3-line text-xl" />
        <span class="font-medium">{{ selectedFile.name }}</span>
        <span class="text-sm text-base-content/70">
          ({{ (selectedFile.size / 1024).toFixed(2) }} KB)
        </span>
      </div>
      <button
        class="btn btn-sm btn-ghost"
        @click="clearFile"
      >
        <i class="ri-close-line" />
        Remove
      </button>
    </div>

    <!-- Processing -->
    <div
      v-if="isProcessing"
      class="flex items-center justify-center py-8"
    >
      <div class="loading loading-spinner loading-lg text-primary" />
      <span class="ml-4">Processing file...</span>
    </div>

    <!-- Validation Results -->
    <div v-if="(importError || importedConfig) && !isProcessing">
      <!-- Success -->
      <div
        v-if="!importError"
        class="alert alert-success alert-soft my-4"
      >
        <i class="ri-check-line text-xl" />
        <span>Configuration is valid and ready to import</span>
      </div>

      <!-- Errors -->
      <div
        v-if="importError"
        class="alert alert-error alert-soft mb-4"
      >
        <div class="flex-1">
          <h3 class="font-bold mb-2 flex items-center gap-2">
            <i class="ri-error-warning-line text-xl" />
            Validation Errors
          </h3>
          <ul class="list-disc list-inside text-sm mt-2">
            <li
              v-for="(message, index) in errorMessages(importError)"
              :key="index"
            >
              {{ message }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Configuration Preview -->
      <div
        v-if="importedConfig"
        class="border border-base-300 rounded-lg p-4 mb-4"
      >
        <h3 class="font-bold mb-2">
          Configuration Details
        </h3>
        <dl class="grid grid-cols-2 gap-2 text-sm">
          <dt class="text-base-content/70">
            Atlas:
          </dt>
          <dd class="font-medium">
            {{ importedConfig.metadata.atlasName }}
          </dd>
          <dt class="text-base-content/70">
            Territories:
          </dt>
          <dd class="font-medium">
            {{ importedConfig.territories.length }}
          </dd>
          <template v-if="importedConfig.metadata.exportDate">
            <dt class="text-base-content/70">
              Export Date:
            </dt>
            <dd class="font-medium">
              {{ new Date(importedConfig.metadata.exportDate).toLocaleString() }}
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
        Cancel
      </button>
      <button
        class="btn btn-primary"
        :disabled="!canApply"
        @click="applyImport"
      >
        <i class="ri-check-line" />
        Apply Configuration
      </button>
    </template>
  </Modal>
</template>
