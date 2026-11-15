<script setup lang="ts">
import type { ExampleDefinition, ExampleFeature } from '@/core/examples'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ExampleFigure from '@/components/examples/ExampleFigure.vue'
import ExampleTooltip from '@/components/examples/ExampleTooltip.vue'
import { useErrorMessage } from '@/composables/useErrorMessage'
import { useExampleMap } from '@/composables/useExampleMap'
import { useFigureTooltip } from '@/composables/useFigureTooltip'
import { colorOf, legendEntries } from '@/core/examples'

const props = defineProps<{ example: ExampleDefinition }>()

const { t, locale } = useI18n()
const { errorMessage } = useErrorMessage()
const { map, error, isLoading } = useExampleMap(props.example)

const { hovered, show, showOn, hide } = useFigureTooltip<ExampleFeature>()

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

function labelOf(feature: ExampleFeature): string {
  return feature.value === null
    ? feature.name
    : `${feature.name}, ${numberFormat.value.format(feature.value)} ${t(`examples.units.${props.example.unit}`)}`
}
</script>

<template>
  <ExampleFigure
    :error-message="error ? errorMessage(error) : null"
    :loading="isLoading || !map"
  >
    <template #map>
      <svg
        v-if="map"
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
          @mousemove="show($event, feature)"
          @mouseleave="hide"
          @focus="showOn($event.currentTarget as Element, feature)"
          @blur="hide"
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
          :d="hovered.item.path"
          class="highlight"
        />
      </svg>
    </template>

    <ExampleTooltip
      v-if="hovered"
      :x="hovered.x"
      :y="hovered.y"
    >
      <span class="font-medium">{{ hovered.item.name }}</span>
      <span v-if="hovered.item.value !== null">{{ numberFormat.format(hovered.item.value) }} {{ t(`examples.units.${example.unit}`) }}</span>
    </ExampleTooltip>

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
  </ExampleFigure>
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
