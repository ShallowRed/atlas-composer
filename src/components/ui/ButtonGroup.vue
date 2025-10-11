<script setup lang="ts">
/**
 * ButtonGroup - Toggle button group for exclusive selection
 *
 * Features:
 * - Multiple options with labels and optional icons
 * - Active state highlighting
 * - Full-width or auto-width layout
 * - Keyboard accessible
 */

interface Option {
  value: string
  label: string
  icon?: string
}

interface Props {
  modelValue: string
  options: Option[]
  fullWidth?: boolean
}

withDefaults(defineProps<Props>(), {
  fullWidth: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function selectOption(value: string) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div
    class="join"
    :class="{ 'w-full': fullWidth }"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="btn join-item"
      :class="{
        'btn-active': modelValue === option.value,
        'flex-1': fullWidth,
      }"
      @click="selectOption(option.value)"
    >
      <i
        v-if="option.icon"
        :class="option.icon"
      />
      {{ option.label }}
    </button>
  </div>
</template>
