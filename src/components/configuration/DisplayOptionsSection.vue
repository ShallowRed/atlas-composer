<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useViewState } from '@/composables/useViewState'
import { BASEMAP_SOURCES } from '@/core/basemap'
import { useProjectionStore } from '@/stores/projection'
import { useUIStore } from '@/stores/ui'

const { t } = useI18n()
const projectionStore = useProjectionStore()
const uiStore = useUIStore()
const { viewOrchestration } = useViewState()

const BASEMAP_ICONS = { none: 'ri-shape-line', relief: 'ri-landscape-line', imagery: 'ri-earth-line', streets: 'ri-road-map-line' } as const

const basemaps = computed(() => BASEMAP_SOURCES.map(source => ({ value: source, label: t(`basemap.sources.${source}`), icon: BASEMAP_ICONS[source] })))

const overlays = computed(() => [
  { key: 'borders', label: t('settings.compositionBorders'), icon: 'ri-shape-2-line', shown: viewOrchestration.shouldShowCompositionBordersToggle.value, pressed: uiStore.showCompositionBorders, toggle: () => { uiStore.showCompositionBorders = !uiStore.showCompositionBorders } },
  { key: 'limits', label: t('settings.mapLimits'), icon: 'ri-crop-line', shown: true, pressed: uiStore.showMapLimits, toggle: () => { uiStore.showMapLimits = !uiStore.showMapLimits } },
  { key: 'graticule', label: t('settings.graticule'), icon: 'ri-grid-line', shown: true, pressed: uiStore.showGraticule, toggle: () => { uiStore.showGraticule = !uiStore.showGraticule } },
  { key: 'scale', label: t('territory.scalePreservation'), icon: 'ri-ruler-line', shown: viewOrchestration.shouldShowScalePreservationToggle.value, pressed: projectionStore.scalePreservation, toggle: () => { projectionStore.scalePreservation = !projectionStore.scalePreservation } },
].filter(({ shown }) => shown))
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-x-4 gap-y-2"
    role="group"
    :aria-label="t('settings.renderingOptions')"
  >
    <div
      class="join"
      role="radiogroup"
      :aria-label="t('basemap.label')"
    >
      <label
        v-for="basemap in basemaps"
        :key="basemap.value"
        class="btn btn-sm join-item font-normal has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
        :class="uiStore.basemap === basemap.value ? 'btn-primary' : 'btn-soft'"
        :title="basemap.label"
      >
        <input
          v-model="uiStore.basemap"
          type="radio"
          name="basemap"
          :value="basemap.value"
          class="sr-only"
        >
        <i
          :class="basemap.icon"
          aria-hidden="true"
        />
        <span class="max-sm:sr-only">{{ basemap.label }}</span>
      </label>
    </div>
    <div class="flex flex-wrap gap-1">
      <button
        v-for="overlay in overlays"
        :key="overlay.key"
        type="button"
        class="btn btn-sm btn-ghost font-normal"
        :aria-pressed="overlay.pressed"
        :title="overlay.label"
        @click="overlay.toggle"
      >
        <i
          :class="[overlay.icon, { 'text-primary': overlay.pressed }]"
          aria-hidden="true"
        />
        <span class="max-sm:sr-only">{{ overlay.label }}</span>
      </button>
    </div>
  </div>
</template>
