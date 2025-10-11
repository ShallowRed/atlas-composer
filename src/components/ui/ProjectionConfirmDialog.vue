<script setup lang="ts">
import type { ProjectionDefinition } from '@/core/projections/types'

import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  projection: ProjectionDefinition | null
  message: string
  alternatives?: ProjectionDefinition[]
}

const props = withDefaults(defineProps<Props>(), {
  alternatives: undefined,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const { t } = useI18n()

// Dialog ref for programmatic control
const dialogRef = ref<HTMLDialogElement | null>(null)

// Show dialog when projection changes
watch(() => props.projection, (newProjection) => {
  if (newProjection && dialogRef.value) {
    dialogRef.value.showModal()
  }
})

function handleConfirm() {
  dialogRef.value?.close()
  emit('confirm')
}

function handleCancel() {
  dialogRef.value?.close()
  emit('cancel')
}
</script>

<template>
  <dialog
    ref="dialogRef"
    class="modal"
  >
    <div class="modal-box">
      <h3 class="font-bold text-lg flex items-center gap-2">
        <i class="ri-error-warning-line text-error" />
        {{ t('projection.validation.warningTitle') }}
      </h3>

      <p class="py-4">
        {{ message }}
      </p>

      <!-- Alternative projections -->
      <div
        v-if="alternatives && alternatives.length > 0"
        class="alert alert-info mt-4"
      >
        <i class="ri-lightbulb-line" />
        <div class="flex flex-col gap-1">
          <span class="font-medium">{{ t('projection.validation.suggestedAlternatives') }}</span>
          <ul class="list-disc list-inside">
            <li
              v-for="alt in alternatives"
              :key="alt.id"
            >
              {{ t(alt.name) }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-action">
        <button
          class="btn btn-ghost"
          @click="handleCancel"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          class="btn btn-error"
          @click="handleConfirm"
        >
          {{ t('projection.validation.useAnyway') }}
        </button>
      </div>
    </div>

    <!-- Backdrop -->
    <form
      method="dialog"
      class="modal-backdrop"
    >
      <button @click="handleCancel">
        close
      </button>
    </form>
  </dialog>
</template>
