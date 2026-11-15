<script setup lang="ts">
import type { ExampleDefinition, ExampleFeature } from '@/core/examples'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useErrorMessage } from '@/composables/useErrorMessage'
import { useExampleMap } from '@/composables/useExampleMap'
import { colorOf, legendEntries } from '@/core/examples'

const props = defineProps<{ example: ExampleDefinition }>()

const { t, locale } = useI18n()
const { errorMessage } = useErrorMessage()
const { map, error, isLoading } = useExampleMap(props.example)

const hovered = ref<{ feature: ExampleFeature, x: number, y: number } | null>(null)

const numberFormat = computed(() => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }))

const legend = computed(() => legendEntries(props.example.thresholds, props.example.colors).map(({ color, from, to }) => {
  const format = (value: number) => numberFormat.value.format(value)
  const label = from === undefined
    ? `< ${format(to!)}`
    : to === undefined ? `≥ ${format(from)}` : `${format(from)}–${format(to)}`
  return { color, label }
}))

function fillOf(feature: ExampleFeature): string {
  return colorOf(feature.value, props.example.thresholds, props.example.colors)
}

function hover(event: MouseEvent, feature: ExampleFeature) {
  const rect = (event.currentTarget as SVGElement).closest('figure')!.getBoundingClientRect()
  hovered.value = { feature, x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function focus(event: FocusEvent, feature: ExampleFeature) {
  const target = event.currentTarget as SVGElement
  const rect = target.closest('figure')!.getBoundingClientRect()
  const box = target.getBoundingClientRect()
  hovered.value = { feature, x: box.left + box.width / 2 - rect.left, y: box.top + box.height / 2 - rect.top }
}

function labelOf(feature: ExampleFeature): string {
  return feature.value === null
    ? feature.name
    : `${feature.name}, ${numberFormat.value.format(feature.value)} ${t(`examples.units.${props.example.unit}`)}`
}
</script>

<template>
  <figure class="relative flex flex-col gap-3">
    <div
      v-if="error"
      role="alert"
      class="alert alert-error text-sm"
    >
      {{ errorMessage(error) }}
    </div>
    <div
      v-else-if="isLoading || !map"
      class="aspect-[3/2] rounded-box border border-base-300 bg-base-100"
      :aria-label="t('actions.loading')"
    />
    <svg
      v-else
      :viewBox="`0 0 ${map.width} ${map.height}`"
      class="w-full h-auto rounded-box border border-base-300 bg-base-100"
      role="group"
      :aria-label="t(`examples.${example.id}.title`)"
    >
      <rect
        v-for="(frame, index) in map.frames"
        :key="index"
        :x="frame.x"
        :y="frame.y"
        :width="frame.width"
        :height="frame.height"
        class="frame"
      />
      <path
        v-for="(feature, index) in map.features"
        :key="index"
        :d="feature.path"
        :fill="fillOf(feature)"
        class="feature"
        tabindex="0"
        role="img"
        :aria-label="labelOf(feature)"
        @mousemove="hover($event, feature)"
        @mouseleave="hovered = null"
        @focus="focus($event, feature)"
        @blur="hovered = null"
      />
      <path
        v-for="(d, level) in map.borders"
        :key="level"
        :d="d"
        class="border"
        :class="`border-${level}`"
      />
      <path
        v-if="hovered"
        :d="hovered.feature.path"
        class="highlight"
      />
    </svg>

    <div
      v-if="hovered"
      class="pointer-events-none absolute z-10 flex flex-col rounded-field border border-base-300 bg-base-100 px-2.5 py-1.5 text-xs shadow-md whitespace-nowrap"
      :style="{ left: `${hovered.x + 12}px`, top: `${hovered.y - 12}px` }"
    >
      <span class="font-medium">{{ hovered.feature.name }}</span>
      <span v-if="hovered.feature.value !== null">{{ numberFormat.format(hovered.feature.value) }} {{ t(`examples.units.${example.unit}`) }}</span>
    </div>

    <figcaption class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span
        v-for="entry in legend"
        :key="entry.color"
        class="flex items-center gap-1.5"
      >
        <span
          class="inline-block h-3 w-4 rounded-xs"
          :style="{ backgroundColor: entry.color }"
        />
        {{ entry.label }}
      </span>
      <span class="text-base-content/70">{{ t(`examples.units.${example.unit}`) }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.feature:focus {
  outline: none;
}

.border,
.highlight {
  fill: none;
  pointer-events: none;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

/* The fills of the scale keep their colors in every theme, and so do the inner and group borders drawn over them */
.border-inner {
  stroke: rgb(255 255 255 / 0.6);
  stroke-width: 0.5;
}

.border-group {
  stroke: white;
  stroke-width: 1.25;
}

.border-outline {
  stroke: color-mix(in oklch, var(--color-base-content) 55%, var(--color-base-100));
  stroke-width: 0.75;
}

.highlight {
  stroke: var(--color-base-content);
  stroke-width: 1.5;
}

.frame {
  fill: none;
  stroke: color-mix(in oklch, var(--color-base-content) 15%, var(--color-base-100));
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
</style>
