<script setup lang="ts">
import type { AxisControl } from '@/core/parameters'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSliderState } from '@/composables/useSliderState'
import { formatValue, isOutsideTrack, toDomain, trackScale, valueAtTrackPosition } from '@/core/parameters'

interface Props {
  modelValue: number
  control: AxisControl
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const { locale } = useI18n()
const { setSliderActive, setSliderInactive } = useSliderState()

const RESOLUTION = 1000

const track = computed(() => {
  const { track } = props.control
  if (!track || !('scale' in track)) {
    throw new Error('A parameter track needs a linear or logarithmic track')
  }
  return track
})

const scale = computed(() => trackScale(track.value))

const position = computed(() => Math.round(scale.value(props.modelValue) * RESOLUTION))

const outside = computed(() => isOutsideTrack(props.modelValue, track.value))

// The capture keeps the end of the drag when the pointer is released beyond the track
function onPointerDown(event: PointerEvent) {
  ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
  setSliderActive()
}

function onInput(event: Event) {
  const value = valueAtTrackPosition(track.value, Number((event.target as HTMLInputElement).value) / RESOLUTION)
  emit('update:modelValue', toDomain(value, props.control.domain, props.control.format))
}

// The ticks at the ends align on the edges of the track
const ticks = computed(() => track.value.ticks.map((value) => {
  const at = scale.value(value)
  const shift = at < 0.05 ? '0' : at > 0.95 ? '-100%' : '-50%'
  return {
    value,
    label: `${formatValue(value, props.control.format, locale.value)}${props.control.symbol}`,
    style: { left: `${at * 100}%`, transform: `translateX(${shift})` },
  }
}))
</script>

<template>
  <div class="relative pb-4">
    <!-- The field next to the track takes the keyboard and the assistive technologies -->
    <input
      type="range"
      class="range range-primary range-xs w-full"
      :class="{ 'opacity-60': outside }"
      min="0"
      :max="RESOLUTION"
      step="1"
      :value="position"
      tabindex="-1"
      aria-hidden="true"
      @input="onInput"
      @pointerdown="onPointerDown"
      @lostpointercapture="setSliderInactive"
    >
    <span
      v-for="tick in ticks"
      :key="tick.value"
      class="absolute bottom-0 text-[10px] leading-none text-base-content/50 tabular-nums"
      :style="tick.style"
      aria-hidden="true"
    >{{ tick.label }}</span>
  </div>
</template>
