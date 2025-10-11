<script setup lang="ts">
/**
 * Modal - Standardized dialog wrapper component
 *
 * Features:
 * - Consistent modal structure and styling
 * - Optional close button
 * - Customizable max width
 * - Named slots for title, content, and actions
 * - Click outside to close
 * - Accessible with proper ARIA attributes
 */

interface Props {
  modelValue: boolean
  title?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl'
  showCloseButton?: boolean
}

withDefaults(defineProps<Props>(), {
  title: undefined,
  maxWidth: '2xl',
  showCloseButton: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <dialog
    :open="modelValue"
    class="modal"
    @click.self="close"
  >
    <div
      class="modal-box"
      :class="`max-w-${maxWidth}`"
    >
      <!-- Header -->
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-bold">
          <slot name="title">
            {{ title }}
          </slot>
        </h3>
        <button
          v-if="showCloseButton"
          class="btn btn-circle btn-ghost btn-sm"
          aria-label="Close"
          @click="close"
        >
          ✕
        </button>
      </div>

      <!-- Content -->
      <slot />

      <!-- Actions -->
      <div
        v-if="$slots.actions"
        class="modal-action"
      >
        <slot name="actions" />
      </div>
    </div>
  </dialog>
</template>
