<script setup lang="ts">
import type { ExportedCompositeConfig } from '@/types/export-config'
import { computed, ref } from 'vue'
import Modal from '@/components/ui/primitives/Modal.vue'
import { CompositeImportService } from '@/services/export/composite-import-service'
import { useConfigStore } from '@/stores/config'
import { useTerritoryStore } from '@/stores/territory'

const props = defineProps<{
  modelValue: boolean
  atlasId: string
  compositeProjection: any
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'imported': [config: ExportedCompositeConfig]
}>()

const configStore = useConfigStore()
const territoryStore = useTerritoryStore()

// State
const isDragging = ref(false)
const isProcessing = ref(false)
const selectedFile = ref<File | null>(null)
const importResult = ref<{ success: boolean, errors: string[], warnings: string[] } | null>(null)
const importedConfig = ref<ExportedCompositeConfig | null>(null)

// Computed
const hasErrors = computed(() => importResult.value && importResult.value.errors.length > 0)
const hasWarnings = computed(() => importResult.value && importResult.value.warnings.length > 0)
const canApply = computed(() => importedConfig.value && !hasErrors.value)

// Methods
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
  importResult.value = null
  importedConfig.value = null

  try {
    // Import and validate
    const result = await CompositeImportService.importFromFile(file)
    importResult.value = result

    if (result.success && result.config) {
      importedConfig.value = result.config

      // Check atlas compatibility
      const compatibility = CompositeImportService.checkAtlasCompatibility(
        result.config,
        props.atlasId,
      )

      if (compatibility.warnings.length > 0) {
        importResult.value.warnings.push(...compatibility.warnings)
      }
    }
  }
  catch (error) {
    importResult.value = {
      success: false,
      errors: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
    }
  }
  finally {
    isProcessing.value = false
  }
}

function applyImport() {
  if (!canApply.value || !importedConfig.value) {
    return
  }

  // Apply to stores
  CompositeImportService.applyToStores(
    importedConfig.value,
    configStore,
    territoryStore,
    props.compositeProjection,
  )

  // Emit success and close
  emit('imported', importedConfig.value)
  handleClose()
}

function handleClose() {
  // Reset state
  selectedFile.value = null
  importResult.value = null
  importedConfig.value = null
  isDragging.value = false
  isProcessing.value = false

  emit('update:modelValue', false)
}

function clearFile() {
  selectedFile.value = null
  importResult.value = null
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
      <div class="mb-4">
        <svg
          class="w-16 h-16 mx-auto text-base-content/30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>
      <p class="text-lg font-medium mb-2">
        Drag and drop a JSON file here
      </p>
      <p class="text-sm text-base-content/70 mb-4">
        or
      </p>
      <label class="btn btn-primary">
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
      class="alert"
    >
      <div class="flex items-center gap-2 flex-1">
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span class="font-medium">{{ selectedFile.name }}</span>
        <span class="text-sm text-base-content/70">
          ({{ (selectedFile.size / 1024).toFixed(2) }} KB)
        </span>
      </div>
      <button
        class="btn btn-sm btn-ghost"
        @click="clearFile"
      >
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
    <div v-if="importResult && !isProcessing">
      <!-- Success -->
      <div
        v-if="importResult.success"
        class="alert alert-success mb-4"
      >
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Configuration is valid and ready to import</span>
      </div>

      <!-- Errors -->
      <div
        v-if="hasErrors"
        class="alert alert-error mb-4"
      >
        <div class="flex-1">
          <svg
            class="w-6 h-6 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 class="font-bold">
              Validation Errors
            </h3>
            <ul class="list-disc list-inside text-sm mt-2">
              <li
                v-for="(error, index) in importResult.errors"
                :key="index"
              >
                {{ error }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Warnings -->
      <div
        v-if="hasWarnings"
        class="alert alert-warning mb-4"
      >
        <div class="flex-1">
          <svg
            class="w-6 h-6 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h3 class="font-bold">
              Warnings
            </h3>
            <ul class="list-disc list-inside text-sm mt-2">
              <li
                v-for="(warning, index) in importResult.warnings"
                :key="index"
              >
                {{ warning }}
              </li>
            </ul>
          </div>
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
            Pattern:
          </dt>
          <dd class="font-medium">
            {{ importedConfig.pattern }}
          </dd>
          <dt class="text-base-content/70">
            Territories:
          </dt>
          <dd class="font-medium">
            {{ importedConfig.territories.length }}
          </dd>
          <dt class="text-base-content/70">
            Export Date:
          </dt>
          <dd class="font-medium">
            {{ new Date(importedConfig.metadata.exportDate).toLocaleString() }}
          </dd>
        </dl>
      </div>
    </div>

    <!-- Actions -->
    <template #actions>
      <button
        class="btn btn-ghost"
        @click="handleClose"
      >
        Cancel
      </button>
      <button
        class="btn btn-primary"
        :disabled="!canApply"
        @click="applyImport"
      >
        Apply Configuration
      </button>
    </template>
  </Modal>
</template>
