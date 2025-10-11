<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  label: string
  icon?: string
  modelValue?: string | boolean
  type?: 'select' | 'checkbox' | 'toggle'
  disabled?: boolean
  options?: Array<{ value: string, label: string }>
  optionGroups?: Array<{
    key?: string
    label?: string
    category?: string
    options?: Array<{ value: string, label: string }>
  }>
}

const props = withDefaults(defineProps<Props>(), {
  type: 'select',
  icon: undefined,
  modelValue: undefined,
  disabled: false,
  options: undefined,
  optionGroups: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | boolean]
  'change': [value: string | boolean]
}>()

const localValue = computed({
  get: () => props.modelValue,
  set: (value: string | boolean | undefined) => {
    if (value !== undefined) {
      emit('update:modelValue', value)
      emit('change', value)
    }
  },
})
</script>

<template>
  <fieldset class="fieldset form-control flex flex-col">
    <!-- Select with Option Groups -->
    <template v-if="type === 'select' && optionGroups">
      <legend class="fieldset-legend text-xl">
        <span class="label-text flex items-center gap-2">
          <i v-if="icon" :class="icon" />
          {{ label }}
        </span>
      </legend>
      <select
        v-model="localValue"
        class="select cursor-pointer"
        :disabled="disabled"
      >
        <optgroup
          v-for="group in optionGroups"
          :key="group.key || group.category"
          :label="group.label || group.category"
        >
          <option
            v-for="option in group.options || []"
            :key="option.value"
            :value="option.value"
          >
            {{ $t(option.label) }}
          </option>
        </optgroup>
      </select>
    </template>

    <!-- Select with Simple Options -->
    <template v-else-if="type === 'select' && options">
      <legend class="fieldset-legend text-sm">
        <span class="label-text flex items-center gap-2">
          <i v-if="icon" :class="icon" />
          {{ label }}
        </span>
      </legend>
      <select
        v-model="localValue"
        class="select cursor-pointer"
        :disabled="disabled"
      >
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </template>

    <!-- Select with Default Slot -->
    <template v-else-if="type === 'select'">
      <legend class="fieldset-legend text-sm">
        <span class="label-text flex items-center gap-2">
          <i v-if="icon" :class="icon" />
          {{ label }}
        </span>
      </legend>
      <select
        v-model="localValue"
        class="select cursor-pointer"
        :disabled="disabled"
      >
        <slot />
      </select>
    </template>

    <!-- Toggle/Checkbox -->
    <template v-else-if="type === 'toggle' || type === 'checkbox'">
      <label class="label cursor-pointer flex flex-row-reverse justify-end gap-2">
        <span>{{ label }}</span>
        <input
          v-model="localValue"
          type="checkbox"
          :disabled="disabled"
          :class="type === 'toggle' ? 'toggle toggle-sm' : 'checkbox'"
        >
      </label>
    </template>
  </fieldset>
</template>
