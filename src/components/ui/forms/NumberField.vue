<script setup lang="ts">
import type { AxisControl } from '@/core/parameters'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSliderState } from '@/composables/useSliderState'
import { boundDomain, formatValue, parseValue, stepFactor, stepValue, toDomain } from '@/core/parameters'

interface Props {
  label: string
  modelValue: number
  control: AxisControl
  // Bounds set by the axis this one faces, such as the opposite edge of a frame
  limits?: { min?: number, max?: number }
  prefix?: string
  prefixIcon?: string
  // The prefix changes the value when dragged sideways
  scrub?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  limits: undefined,
  prefix: undefined,
  prefixIcon: undefined,
  scrub: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const { locale } = useI18n()
const { setSliderActive, setSliderInactive } = useSliderState()

const control = computed<AxisControl>(() => props.limits
  ? { ...props.control, domain: boundDomain(props.control.domain, props.limits) }
  : props.control)

const draft = ref<string | null>(null)

const display = computed(() => draft.value ?? formatValue(props.modelValue, props.control.format, locale.value))

function commit() {
  if (draft.value === null) {
    return
  }
  const value = parseValue(draft.value, locale.value)
  draft.value = null
  if (value !== null) {
    emit('update:modelValue', toDomain(value, control.value.domain, control.value.format))
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault()
    draft.value = null
    emit('update:modelValue', stepValue(props.modelValue, control.value, event.key === 'ArrowUp' ? 1 : -1, stepFactor(event)))
  }
  else if (event.key === 'Enter') {
    commit()
  }
  else if (event.key === 'Escape') {
    draft.value = null
    ;(event.target as HTMLInputElement).blur()
  }
}

// Two pixels of drag make one step
const SCRUB_PIXELS_PER_STEP = 2

let scrubStartX = 0
let scrubStartValue = 0

function onScrubStart(event: PointerEvent) {
  if (!props.scrub) {
    return
  }
  event.preventDefault()
  ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
  scrubStartX = event.clientX
  scrubStartValue = props.modelValue
  setSliderActive()
}

function onScrubMove(event: PointerEvent) {
  if (!(event.currentTarget as Element).hasPointerCapture(event.pointerId)) {
    return
  }
  const steps = Math.round((event.clientX - scrubStartX) / SCRUB_PIXELS_PER_STEP)
  let value = scrubStartValue
  for (let index = 0; index < Math.abs(steps); index++) {
    value = stepValue(value, control.value, steps > 0 ? 1 : -1, stepFactor(event))
  }
  emit('update:modelValue', value)
}

function onScrubEnd(event: PointerEvent) {
  const target = event.currentTarget as Element
  if (target.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
    setSliderInactive()
  }
}
</script>

<template>
  <label class="input input-sm w-full gap-1 px-2 tabular-nums">
    <span
      v-if="prefix || prefixIcon"
      class="flex-none select-none text-base-content/60"
      :class="{ 'cursor-ew-resize touch-none': scrub }"
      aria-hidden="true"
      @pointerdown="onScrubStart"
      @pointermove="onScrubMove"
      @pointerup="onScrubEnd"
      @pointercancel="onScrubEnd"
    >
      <i
        v-if="prefixIcon"
        :class="prefixIcon"
      />
      <template v-else>{{ prefix }}</template>
    </span>
    <input
      type="text"
      inputmode="decimal"
      role="spinbutton"
      class="min-w-0 grow text-right"
      :aria-label="label"
      :aria-valuenow="modelValue"
      :aria-valuemin="Number.isFinite(control.domain.min) ? control.domain.min : undefined"
      :aria-valuemax="Number.isFinite(control.domain.max) ? control.domain.max : undefined"
      :value="display"
      @input="draft = ($event.target as HTMLInputElement).value"
      @keydown="onKeydown"
      @blur="commit"
      @focus="($event.target as HTMLInputElement).select()"
    >
    <span
      v-if="control.symbol"
      class="flex-none text-base-content/60"
      aria-hidden="true"
    >{{ control.symbol }}</span>
  </label>
</template>
