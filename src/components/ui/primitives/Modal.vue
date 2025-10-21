<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

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
 * - Auto-focus on open
 */

interface Props {
  modelValue: boolean
  icon?: string
  title?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl'
  showCloseButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  icon: undefined,
  title: undefined,
  maxWidth: '2xl',
  showCloseButton: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const modalBoxRef = ref<HTMLElement | null>(null)

function close() {
  emit('update:modelValue', false)
}

// Focus the modal when it opens
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    // Use multiple nextTick calls to ensure Teleport has completed
    await nextTick()
    await nextTick()

    // Additional fallback with setTimeout for Teleport
    setTimeout(() => {
      modalBoxRef.value?.focus()
    }, 0)
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="modal modal-open"
      @click.self="close"
    >
      <div
        ref="modalBoxRef"
        class="modal-box"
        :class="`max-w-${maxWidth} max-h-60vh`"
        tabindex="-1"
      >
        <!-- Header -->
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-bold">
            <slot name="title">
              <i
                v-if="icon"
                :class="`${icon} mr-1`"
              />
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
    </div>
  </Teleport>
</template>
