<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  label: string
  icon?: string
  modelValue?: boolean
  disabled?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  icon: undefined,
  modelValue: false,
  disabled: false,
  size: 'sm',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'change': [value: boolean]
}>()

const localValue = computed({
  get: () => props.modelValue,
  set: (value: boolean | undefined) => {
    if (value !== undefined) {
      emit('update:modelValue', value)
      emit('change', value)
    }
  },
})
</script>

<template>
  <fieldset class="fieldset form-control flex flex-col">
    <label class="label cursor-pointer flex flex-row-reverse justify-end gap-2">
      <span>{{ label }}</span>
      <input
        v-model="localValue"
        type="checkbox"
        :disabled="disabled"
        class="toggle"
        :class="{
          'toggle-xs': size === 'xs',
          'toggle-sm': size === 'sm',
          'toggle-md': size === 'md',
          'toggle-lg': size === 'lg',
        }"
      >
    </label>
  </fieldset>
</template>
