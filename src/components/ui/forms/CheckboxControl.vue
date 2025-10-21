<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  label: string
  icon?: string
  modelValue?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  icon: undefined,
  modelValue: false,
  disabled: false,
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
        class="checkbox"
      >
    </label>
  </fieldset>
</template>
