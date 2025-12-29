<script setup lang="ts">
import type { AtlasId, TerritoryCode } from '@/types/branded'
import type { ExportedCompositeConfig } from '@/types/export-config'
import { computed, ref } from 'vue'

import Modal from '@/components/ui/primitives/Modal.vue'
import { CompositeImportService } from '@/services/export/composite-import-service'
import { InitializationService } from '@/services/initialization/initialization-service'
import { logger } from '@/utils/logger'

const props = defineProps<{
  modelValue: boolean
  atlasId: AtlasId
  compositeProjection: any
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'imported': [config: ExportedCompositeConfig]
}>()

const debug = logger.vue.component

// State
const isDragging = ref(false)
const isProcessing = ref(false)
const selectedFile = ref<File | null>(null)
const importResult = ref<{ success: boolean, errors: string[], warnings: string[] } | null>(null)
const importedConfig = ref<ExportedCompositeConfig | null>(null)

// Computed
const hasErrors = computed(() => importResult.value && importResult.value.errors.length > 0)
const hasWarnings = computed(() => importResult.value && importResult.value.warnings.length > 0)
const canApply = computed(() =>
  importedConfig.value
  && !hasErrors.value
  && props.compositeProjection !== null
  && props.compositeProjection !== undefined,
)

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

async function applyImport() {
  if (!canApply.value || !importedConfig.value) {
    return
  }

  // Check if composite projection exists
  if (!props.compositeProjection) {
    debug('Cannot apply import: composite projection is not available')
    importResult.value = {
      success: false,
      errors: ['Cannot apply import: composite projection not initialized. Switch to composite-custom mode first.'],
      warnings: importResult.value?.warnings || [],
    }
    return
  }

  try {
    // Use InitializationService for consistent import handling
    const result = await InitializationService.importConfiguration({
      config: importedConfig.value,
      validateAtlasCompatibility: true,
    })

    if (!result.success) {
      importResult.value = {
        success: false,
        errors: result.errors,
        warnings: result.warnings,
      }
      return
    }

    // Update cartographer if needed
    const { useGeoDataStore } = await import('@/stores/geoData')
    const geoDataStore = useGeoDataStore()

    if (geoDataStore.cartographer && result.state) {
      const territoryParameters = result.state.parameters.territories
      // Convert: Object.keys returns string[], need TerritoryCode for store methods
      Object.keys(territoryParameters).forEach((territoryCode) => {
        geoDataStore.cartographer!.updateTerritoryParameters(territoryCode as TerritoryCode)
      })
      debug('Updated cartographer for %d territories', Object.keys(territoryParameters).length)

      // Trigger render
      geoDataStore.triggerRender()
    }

    // Emit success and close
    emit('imported', importedConfig.value)
    handleClose()
  }
  catch (error) {
    debug('Error applying import: %o', error)
    importResult.value = {
      success: false,
      errors: [`Failed to apply import: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: importResult.value?.warnings || [],
    }
  }
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
    <div v-if="importResult && !isProcessing">
      <!-- Success -->
      <div
        v-if="importResult.success"
        class="alert alert-success alert-soft my-4"
      >
        <i class="ri-check-line text-xl" />
        <span>Configuration is valid and ready to import</span>
      </div>

      <!-- Errors -->
      <div
        v-if="hasErrors"
        class="alert alert-error alert-soft mb-4"
      >
        <div class="flex-1">
          <h3 class="font-bold mb-2 flex items-center gap-2">
            <i class="ri-error-warning-line text-xl" />
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

      <!-- Warnings -->
      <div
        v-if="hasWarnings"
        class="alert alert-warning mb-4"
      >
        <div class="flex-1">
          <i class="ri-alert-line text-xl flex-shrink-0" />
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
