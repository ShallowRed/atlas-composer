<script setup lang="ts">
/**
 * RangeSlider - Reusable range input component with label, icon, and value display
 *
 * Features:
 * - Customizable range, step, and units
 * - Icon support
 * - Color variants (primary, secondary, accent)
 * - Size variants (xs, sm, md)
 * - Optional midpoint display
 * - Real-time value display
 */

interface Props {
  label: string
  icon?: string
  modelValue: number
  min: number
  max: number
  step?: number
  unit?: string
  color?: 'primary' | 'secondary' | 'accent'
  size?: 'xs' | 'sm' | 'md'
  showMidpoint?: boolean
  decimals?: number // Number of decimal places to show
}

const props = withDefaults(defineProps<Props>(), {
  icon: undefined,
  step: 1,
  unit: '',
  color: 'primary',
  size: 'xs',
  showMidpoint: false,
  decimals: 0,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function handleInput(event: Event) {
  const value = Number.parseFloat((event.target as HTMLInputElement).value)
  emit('update:modelValue', value)
}

// Format value with proper decimal places
function formatValue(value: number): string {
  return props.decimals > 0 ? value.toFixed(props.decimals) : Math.round(value).toString()
}

// Calculate midpoint for display
const midpoint = () => formatValue((props.max + props.min) / 2)
</script>

<template>
  <div>
    <label class="label">
      <span :class="`label-text text-${size}`">
        <i v-if="icon" :class="`${icon}`" />
        {{ label }}: {{ formatValue(modelValue) }}{{ unit }}
      </span>
    </label>
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      :class="`range range-${color} range-${size}`"
      @input="handleInput"
    >
    <div class="flex justify-between px-2 text-xs opacity-50 mt-1">
      <span>{{ formatValue(min) }}{{ unit }}</span>
      <span v-if="showMidpoint">{{ midpoint() }}{{ unit }}</span>
      <span v-else-if="min < 0 && max > 0">0{{ unit }}</span>
      <span>{{ formatValue(max) }}{{ unit }}</span>
    </div>
  </div>
</template>
