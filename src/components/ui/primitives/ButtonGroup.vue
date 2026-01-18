<script setup lang="ts">
interface Option {
  value: string
  label: string
  icon?: string
}

interface Props {
  modelValue: string
  options: Option[]
  fullWidth?: boolean
  size?: 'xs' | 'sm' | 'md'
}

withDefaults(defineProps<Props>(), {
  fullWidth: false,
  size: 'sm',
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
        'btn-xs': size === 'xs',
        'btn-sm': size === 'sm',
        'btn-md': size === 'md',
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
