<script setup lang="ts">
import type { CompositionMark, PointerLocation } from '@/core/examples'
import type { PresetId } from '@/types/branded'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ExampleFigure from '@/components/examples/ExampleFigure.vue'
import ExampleTooltip from '@/components/examples/ExampleTooltip.vue'
import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import ToggleControl from '@/components/ui/forms/ToggleControl.vue'
import { useAtlasGroups } from '@/composables/useAtlasGroups'
import { useCompositionDemo } from '@/composables/useCompositionDemo'
import { useErrorMessage } from '@/composables/useErrorMessage'
import { useFigureTooltip } from '@/composables/useFigureTooltip'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { findPresetById } from '@/core/atlases/registry'
import { COMPOSITION_PRESETS, locate } from '@/core/examples'

const { t, locale } = useI18n()
const { errorMessage } = useErrorMessage()
const { localize } = useLocalizedName()
const { atlasGroups } = useAtlasGroups()

const presetId = ref<PresetId>(COMPOSITION_PRESETS[0]!)
const { demo, territories, marks, contours, territoryNames, error, isLoading, progress, target, setProgress, play, earthquakesUnavailable } = useCompositionDemo(presetId)

// Each preset of the demo takes the name and the flag of its atlas
const presetOptions = computed(() => {
  const atlases = new Map(atlasGroups.value.flatMap(group => group.options).map(option => [option.value as string, option]))
  return COMPOSITION_PRESETS.map((id) => {
    const atlas = atlases.get(findPresetById(id)?.atlasId ?? '')
    return { value: id as string, label: atlas?.label ?? id, icon: atlas?.icon }
  })
})

const layers = ref({ places: true, earthquakes: true, frames: true })
const earthquakeCount = computed(() => marks.value.filter(({ kind }) => kind === 'earthquake').length)

function territoryName(code: string) {
  const name = territoryNames.value.get(code)
  return name === undefined ? code : localize(name)
}

const coordinateFormat = computed(() => new Intl.NumberFormat(locale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const populationFormat = computed(() => new Intl.NumberFormat(locale.value, { notation: 'compact', maximumFractionDigits: 1 }))
const percentFormat = computed(() => new Intl.NumberFormat(locale.value, { style: 'percent' }))
const magnitudeFormat = computed(() => new Intl.NumberFormat(locale.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 }))

function detailOf(mark: CompositionMark): string {
  return mark.kind === 'place'
    ? t('examples.composition.population', { population: populationFormat.value.format(mark.value) })
    : t('examples.composition.magnitude', { magnitude: magnitudeFormat.value.format(mark.value) })
}

const { hovered, show, hide } = useFigureTooltip<CompositionMark>()
const pointer = ref<PointerLocation | null>(null)
const composed = computed(() => progress.value > 0.999)

function svgPoint(event: MouseEvent): [number, number] {
  const svg = event.currentTarget as SVGSVGElement
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM()!.inverse())
  return [point.x, point.y]
}

function track(event: MouseEvent) {
  pointer.value = composed.value && demo.value ? locate(demo.value.frames, contours.value, svgPoint(event)) : null
}

function leave() {
  pointer.value = null
  hide()
}
</script>

<template>
  <ExampleFigure
    :error-message="error ? errorMessage(error) : null"
    :loading="isLoading && !demo"
  >
    <template #controls>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
        <DropdownControl
          v-model="presetId"
          class="min-w-0 flex-1 sm:w-56 sm:flex-none"
          hide-label
          :label="t('examples.composition.preset')"
          icon="ri-map-2-line"
          :options="presetOptions"
        />
        <button
          type="button"
          class="btn btn-sm btn-primary min-w-32"
          @click="play"
        >
          <i
            class="ri-play-line"
            aria-hidden="true"
          />
          {{ target < 0.5 ? t('examples.composition.compose') : t('examples.composition.decompose') }}
        </button>
        <label class="flex min-w-64 flex-1 items-center gap-3 text-xs text-base-content/70">
          <span>{{ t('examples.composition.raw') }}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            class="range range-xs range-primary flex-1"
            :value="progress"
            :aria-label="t('examples.composition.progress')"
            :aria-valuetext="percentFormat.format(progress)"
            @input="setProgress(Number(($event.target as HTMLInputElement).value))"
          >
          <span>{{ t('examples.composition.composite') }}</span>
        </label>
      </div>

      <div class="flex flex-wrap gap-x-6">
        <ToggleControl
          v-model="layers.places"
          size="xs"
          :label="t('examples.composition.places')"
        />
        <ToggleControl
          v-model="layers.earthquakes"
          size="xs"
          :disabled="earthquakesUnavailable"
          :label="earthquakesUnavailable ? t('examples.composition.earthquakesUnavailable') : t('examples.composition.earthquakes', { count: earthquakeCount })"
        />
        <ToggleControl
          v-model="layers.frames"
          size="xs"
          :label="t('examples.composition.frames')"
        />
      </div>
    </template>

    <template #map>
      <svg
        v-if="demo"
        :viewBox="`0 0 ${demo.width} ${demo.height}`"
        class="w-full h-auto rounded-box border border-base-300 bg-base-100"
        role="img"
        :aria-label="t('examples.composition.title')"
        @mousemove="track"
        @mouseleave="leave"
      >
        <path
          v-if="layers.frames"
          :d="demo.framesPath"
          class="frame"
          :opacity="progress"
        />
        <path
          v-for="territory in territories"
          :key="territory.code"
          :d="territory.path"
          class="land"
        />
        <template
          v-for="mark in marks"
          :key="`${mark.kind}-${mark.label}-${mark.raw}`"
        >
          <circle
            v-if="mark.kind === 'place' ? layers.places : layers.earthquakes"
            :cx="mark.position[0]"
            :cy="mark.position[1]"
            :r="mark.radius"
            :class="mark.kind"
            @mousemove="show($event, mark)"
            @mouseleave="hide"
          />
        </template>
      </svg>
    </template>

    <ExampleTooltip
      v-if="hovered"
      :x="hovered.x"
      :y="hovered.y"
    >
      <span class="font-medium">{{ hovered.item.label }}</span>
      <span>{{ detailOf(hovered.item) }} · {{ territoryName(hovered.item.territory) }}</span>
    </ExampleTooltip>

    <figcaption class="min-h-4 text-xs tabular-nums text-base-content/70">
      <template v-if="pointer">
        {{ coordinateFormat.format(pointer.longitude) }}°, {{ coordinateFormat.format(pointer.latitude) }}°
        · {{ pointer.territory === null ? t('examples.composition.outside') : territoryName(pointer.territory) }}
      </template>
      <template v-else>
        {{ composed ? t('examples.composition.pointerHint') : t('examples.composition.composeHint') }}
      </template>
    </figcaption>
  </ExampleFigure>
</template>

<style scoped>
.frame {
  fill: none;
  stroke: color-mix(in oklch, var(--color-base-content) 25%, var(--color-base-100));
  stroke-dasharray: 3 3;
  vector-effect: non-scaling-stroke;
}

.land {
  fill: color-mix(in oklch, var(--color-base-content) 8%, var(--color-base-100));
  stroke: color-mix(in oklch, var(--color-base-content) 40%, var(--color-base-100));
  stroke-width: 0.5;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.place {
  fill: color-mix(in oklch, var(--color-primary) 35%, transparent);
  stroke: var(--color-primary);
  stroke-width: 0.75;
  vector-effect: non-scaling-stroke;
}

.earthquake {
  fill: color-mix(in oklch, var(--color-error) 30%, transparent);
  stroke: var(--color-error);
  stroke-width: 0.75;
  vector-effect: non-scaling-stroke;
}
</style>
