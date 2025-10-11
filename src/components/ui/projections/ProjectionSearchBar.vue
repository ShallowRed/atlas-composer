<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface Props {
  modelValue: string
  isSearching: boolean
  placeholder?: string
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:isSearching': [value: boolean]
  'clear': []
}>()

const { t } = useI18n()
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200"
    leave-active-class="transition-all duration-200"
    enter-from-class="opacity-0 -translate-y-2"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div v-if="isSearching" class="relative mb-2">
      <input
        :value="modelValue"
        type="text"
        :placeholder="placeholder || t('common.searchProjections')"
        class="input input-sm w-full pr-8"
        autofocus
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
      <button
        v-if="modelValue"
        type="button"
        class="btn btn-ghost btn-xs btn-circle absolute right-1 top-1/2 -translate-y-1/2"
        :aria-label="t('common.clear')"
        @click="emit('clear')"
      >
        <i class="ri-close-line" />
      </button>
    </div>
  </Transition>
</template>
