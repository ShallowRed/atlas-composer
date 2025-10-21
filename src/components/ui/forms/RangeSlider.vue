<script setup lang="ts">
import { computed } from 'vue'
import { useSliderState } from '@/composables/useSliderState'

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
 * - Global slider state tracking for optimized rendering
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

// Track slider active state globally
const { setSliderActive, setSliderInactive } = useSliderState()

function handleInput(event: Event) {
  const value = Number.parseFloat((event.target as HTMLInputElement).value)
  emit('update:modelValue', value)
}

function handleMouseDown() {
  setSliderActive()
}

function handleMouseUp() {
  setSliderInactive()
}

function handleTouchStart() {
  setSliderActive()
}

function handleTouchEnd() {
  setSliderInactive()
}

// Format value with proper decimal places
function formatValue(value: number): string {
  return props.decimals > 0 ? value.toFixed(props.decimals) : Math.round(value).toString()
}

// Calculate midpoint for display
const midpoint = () => formatValue((props.max + props.min) / 2)

// Computed classes for proper reactivity
const rangeClasses = computed(() => [
  'range',
  `range-${props.color}`,
  `range-xs`,
  `range-${props.size}`, // not working?
])

const labelSizeClass = computed(() => `text-${props.size}`)
</script>

<template>
  <div>
    <label class="label">
      <span
        class="label-text mb-1 flex items-center gap-2 font-medium"
        :class="labelSizeClass"
      >
        <i
          v-if="icon"
          :class="icon"
        />
        {{ label }}: {{ formatValue(modelValue) }}{{ unit }}
      </span>
    </label>
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      :class="rangeClasses"
      @input="handleInput"
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
    <div class="flex justify-between px-2 text-xs opacity-50 mt-1">
      <span>{{ formatValue(min) }}{{ unit }}</span>
      <span v-if="showMidpoint">{{ midpoint() }}{{ unit }}</span>
      <span v-else-if="min < 0 && max > 0">0{{ unit }}</span>
      <span>{{ formatValue(max) }}{{ unit }}</span>
    </div>
  </div>
</template>
