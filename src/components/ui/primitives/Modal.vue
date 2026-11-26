<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

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

const { t } = useI18n()

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
      class="modal modal-open modal-bottom lg:modal-middle"
      @click.self="close"
    >
      <div
        ref="modalBoxRef"
        class="modal-box max-h-60vh"
        :class="`max-w-${maxWidth}`"
        tabindex="-1"
      >
        <!-- Header -->
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-bold">
            <slot name="title">
              <i
                v-if="icon"
                class="mr-1"
                :class="icon"
              />
              {{ title }}
            </slot>
          </h3>
          <button
            v-if="showCloseButton"
            class="btn btn-circle btn-ghost btn-sm"
            :aria-label="t('actions.close')"
            @click="close"
          >
            <i class="ri-close-line" />
          </button>
        </div>

        <!-- Content -->
        <slot />

        <!-- Actions, kept in view at the bottom of a window whose content scrolls -->
        <div
          v-if="$slots.actions"
          class="modal-action sticky -bottom-6 -mx-6 -mb-6 bg-base-100 px-6 pb-6 pt-3"
        >
          <slot name="actions" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
