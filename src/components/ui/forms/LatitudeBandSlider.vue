<script setup lang="ts">
import type { AxisControl, LatitudeBand } from '@/core/parameters'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSliderState } from '@/composables/useSliderState'
import { boundDomain, formatValue, orderedPairLimits, roundToStep, toDomain } from '@/core/parameters'

interface Props {
  modelValue: LatitudeBand
  control: AxisControl
  // Latitudes covered by the territories
  band: LatitudeBand
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: LatitudeBand]
}>()

const { locale } = useI18n()
const { setSliderActive, setSliderInactive } = useSliderState()

// Degrees shown beyond the band, and beyond the parallels when they lie outside it
const MARGIN = 5

const track = ref<HTMLElement>()

function extentOf(parallels: LatitudeBand): LatitudeBand {
  return [
    Math.max(props.control.domain.min, Math.floor(Math.min(props.band[0], ...parallels) - MARGIN)),
    Math.min(props.control.domain.max, Math.ceil(Math.max(props.band[1], ...parallels) + MARGIN)),
  ]
}

// The extent stays as it was at the start of a drag, so that a parallel dragged beyond it does not push it
const dragExtent = ref<LatitudeBand | null>(null)
const extent = computed(() => dragExtent.value ?? extentOf(props.modelValue))
const min = computed(() => extent.value[0])
const max = computed(() => extent.value[1])

function percent(latitude: number): number {
  return (latitude - min.value) / (max.value - min.value) * 100
}

const bandStyle = computed(() => ({ left: `${percent(props.band[0])}%`, width: `${percent(props.band[1]) - percent(props.band[0])}%` }))
const rangeStyle = computed(() => ({ left: `${percent(props.modelValue[0])}%`, width: `${percent(props.modelValue[1]) - percent(props.modelValue[0])}%` }))

let activeIndex: 0 | 1 = 0

function latitudeAt(clientX: number): number {
  const rect = track.value!.getBoundingClientRect()
  const at = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  return min.value + at * (max.value - min.value)
}

function update(latitude: number) {
  const [south, north] = props.modelValue
  const domain = boundDomain(props.control.domain, orderedPairLimits(props.modelValue, props.control.format)[activeIndex])
  const value = toDomain(roundToStep(latitude, props.control.step), domain, props.control.format)
  emit('update:modelValue', activeIndex === 0 ? [value, north] : [south, value])
}

function onPointerDown(event: PointerEvent) {
  event.preventDefault()
  const latitude = latitudeAt(event.clientX)
  activeIndex = Math.abs(latitude - props.modelValue[0]) <= Math.abs(latitude - props.modelValue[1]) ? 0 : 1
  dragExtent.value = extent.value
  track.value!.setPointerCapture(event.pointerId)
  setSliderActive()
  update(latitude)
}

function onPointerMove(event: PointerEvent) {
  if (track.value?.hasPointerCapture(event.pointerId)) {
    update(latitudeAt(event.clientX))
  }
}

function onPointerUp(event: PointerEvent) {
  if (track.value?.hasPointerCapture(event.pointerId)) {
    track.value.releasePointerCapture(event.pointerId)
    setSliderInactive()
  }
  dragExtent.value = null
}

const ticks = computed(() => props.band.map(latitude => ({
  latitude,
  label: `${formatValue(latitude, props.control.format, locale.value)}${props.control.symbol}`,
  style: { left: `${percent(latitude)}%` },
})))
</script>

<template>
  <div
    class="pb-4"
    aria-hidden="true"
  >
    <!-- The two fields of the parallels take the keyboard and the assistive technologies -->
    <div
      ref="track"
      class="relative h-5 cursor-pointer touch-none"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div class="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-base-300" />
      <div
        class="latitude-band absolute top-1/2 h-3 -translate-y-1/2 rounded-sm bg-base-content/15"
        :style="bandStyle"
      />
      <div
        class="absolute top-1/2 h-1 -translate-y-1/2 bg-primary"
        :style="rangeStyle"
      />
      <span
        v-for="(latitude, index) in modelValue"
        :key="index"
        class="latitude-thumb absolute top-1/2 size-3.5 -translate-1/2 rounded-full border-2 border-base-100 bg-primary shadow"
        :style="{ left: `${percent(latitude)}%` }"
      />
    </div>
    <div class="relative">
      <span
        v-for="tick in ticks"
        :key="tick.latitude"
        class="absolute top-0.5 -translate-x-1/2 text-[10px] leading-none text-base-content/50 tabular-nums"
        :style="tick.style"
      >{{ tick.label }}</span>
    </div>
  </div>
</template>
