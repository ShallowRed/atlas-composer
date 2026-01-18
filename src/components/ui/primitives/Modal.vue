<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

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

watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    await nextTick()

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
