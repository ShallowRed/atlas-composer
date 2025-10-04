<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  label: string
  icon?: string
  modelValue?: string | boolean
  type?: 'select' | 'checkbox' | 'toggle'
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
  <div class="form-control">
    <!-- Select with Option Groups -->
    <template v-if="type === 'select' && optionGroups">
      <label class="label mb-1">
        <span class="label-text flex items-center gap-2">
          <i v-if="icon" :class="icon" />
          {{ label }}
        </span>
      </label>
      <select
        v-model="localValue"
        class="select cursor-pointer"
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
            {{ option.label }}
          </option>
        </optgroup>
      </select>
    </template>

    <!-- Select with Simple Options -->
    <template v-else-if="type === 'select' && options">
      <label class="label mb-1">
        <span class="label-text flex items-center gap-2">
          <i v-if="icon" :class="icon" />
          {{ label }}
        </span>
      </label>
      <select
        v-model="localValue"
        class="select cursor-pointer"
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
      <label class="label mb-1">
        <span class="label-text flex items-center gap-2">
          <i v-if="icon" :class="icon" />
          {{ label }}
        </span>
      </label>
      <select
        v-model="localValue"
        class="select cursor-pointer"
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
          :class="type === 'toggle' ? 'toggle toggle-primary' : 'checkbox'"
        >
      </label>
    </template>
  </div>
</template>
