<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ProjectionSelector from '@/components/ui/ProjectionSelector.vue'
import { useTerritoryTransforms } from '@/composables/useTerritoryTransforms'

const props = withDefaults(defineProps<Props>(), {
  showTransformControls: true,
})

const { t } = useI18n()

interface Props {
  showTransformControls?: boolean // Show translation/scale controls (false for split mode)
}

// Use composable for all territory transform logic
const {
  territories,
  showMainland,
  mainlandCode,
  isMainlandInTerritories,
  translations,
  scales,
  translationRanges: TRANSLATION_RANGES,
  scaleRange: SCALE_RANGE,
  projectionRecommendations,
  projectionGroups,
  currentAtlasConfig,
  territoryProjections,
  selectedProjection,
  projectionMode,
  setTerritoryTranslation,
  setTerritoryScale,
  setTerritoryProjection,
  resetTransforms,
} = useTerritoryTransforms()

// Event handlers that extract values and call composable functions
function updateTranslation(territoryCode: string, axis: 'x' | 'y', event: Event) {
  const value = Number.parseFloat((event.target as HTMLInputElement).value)
  setTerritoryTranslation(territoryCode, axis, value)
}

function updateScale(territoryCode: string, event: Event) {
  const value = Number.parseFloat((event.target as HTMLInputElement).value)
  setTerritoryScale(territoryCode, value)
}

// Alias for better naming in template
const resetToDefaults = resetTransforms

// Get the best recommended projection
const bestRecommendation = computed(() => {
  if (!projectionRecommendations.value || projectionRecommendations.value.length === 0)
    return null

  // Sort by score and return the best one
  const sorted = [...projectionRecommendations.value].sort((a, b) => b.score - a.score)
  return sorted[0]
})

// Apply the best recommended projection to a territory
function useRecommendedProjection(territoryCode: string) {
  if (bestRecommendation.value) {
    setTerritoryProjection(territoryCode, bestRecommendation.value.projection.id)
  }
}
</script>

<template>
  <div>
    <!-- Message when no territories are available (and no mainland in individual mode) -->
    <div v-if="territories.length === 0 && !(projectionMode === 'individual' && (showMainland || isMainlandInTerritories))" class="alert alert-info">
      <i class="ri-information-line" />
      <span>{{ t('territory.noOverseas') }}</span>
    </div>

    <!-- Accordion for all territories -->
    <div v-else class="join join-vertical w-full">
      <!-- Mainland section (shown when has mainland config OR when mainland is in territories list) -->
      <div
        v-if="projectionMode === 'individual' && (showMainland || isMainlandInTerritories)"
        class="collapse collapse-arrow join-item border bg-base-100 border-base-300"
      >
        <input
          type="radio"
          name="territory-accordion"
          checked
        >
        <div class="collapse-title text-sm font-semibold">
          {{ currentAtlasConfig.splitModeConfig?.mainlandTitle || 'Mainland' }} <span class="text-base-content/50">({{ mainlandCode }})</span>
        </div>
        <div class="collapse-content">
          <!-- Projection Selector -->
          <div class="mb-4">
            <ProjectionSelector
              :model-value="territoryProjections[mainlandCode] || selectedProjection"
              :label="t('projection.cartographic')"
              :projection-groups="projectionGroups"
              :recommendations="projectionRecommendations"
              @update:model-value="(value) => setTerritoryProjection(mainlandCode, value)"
            />
            <!-- Quick action button to apply best recommendation -->
            <button
              v-if="bestRecommendation"
              class="btn btn-sm btn-ghost w-full mt-2 gap-2"
              @click="useRecommendedProjection(mainlandCode)"
            >
              <i class="ri-magic-line" />
              {{ t('projection.useRecommended', { projection: $t(bestRecommendation.projection.name) }) }}
            </button>
          </div>
        </div>
      </div>

      <!-- Overseas territories (excluding mainland to avoid duplication) -->
      <div
        v-for="(territory, index) in territories.filter(t => t.code !== mainlandCode)"
        :key="territory.code"
        class="collapse collapse-arrow join-item border bg-base-100 border-base-300"
      >
        <input
          type="radio"
          name="territory-accordion"
          :checked="projectionMode === 'uniform' && index === 0"
        >
        <div class="collapse-title text-sm font-semibold text-sm font-semibold">
          {{ territory.name }} <span class="text-base-content/50">({{ territory.code }})</span>
        </div>
        <div class="collapse-content">
          <!-- Projection Selector (always shown in individual mode) -->
          <div v-if="projectionMode === 'individual'" class="mb-4">
            <ProjectionSelector
              :model-value="territoryProjections[territory.code] || selectedProjection"
              :label="t('projection.cartographic')"
              :projection-groups="projectionGroups"
              :recommendations="projectionRecommendations"
              @update:model-value="(value) => setTerritoryProjection(territory.code, value)"
            />
            <!-- Quick action button to apply best recommendation -->
            <Transition
              enter-active-class="transition-all duration-300"
              leave-active-class="transition-all duration-300"
              enter-from-class="opacity-0 translate-y-2"
              leave-to-class="opacity-0 translate-y-2"
            >
              <button
                v-if="bestRecommendation"
                class="btn btn-sm btn-ghost mt-4 gap-2"
                @click="useRecommendedProjection(territory.code)"
              >
                <i class="ri-magic-line" />
                {{ t('projection.useRecommended', { projection: $t(bestRecommendation.projection.name) }) }}
              </button>
            </Transition>
          </div>

          <!-- Transform Controls (hidden in split mode) -->
          <template v-if="props.showTransformControls">
            <!-- X Translation (in pixels relative to mainland center) -->
            <div class="mb-4">
              <label class="label">
                <span class="label-text">
                  <i class="ri-arrow-left-right-line" />
                  {{ t('territory.positionX') }}: {{ Math.round(translations[territory.code]?.x || 0) }}px
                </span>
              </label>
              <input
                type="range"
                :min="TRANSLATION_RANGES.x.min"
                :max="TRANSLATION_RANGES.x.max"
                :step="TRANSLATION_RANGES.x.step"
                :value="translations[territory.code]?.x || 0"
                class="range range-primary range-xs"
                @input="updateTranslation(territory.code, 'x', $event)"
              >
              <div class="flex justify-between px-2 text-xs opacity-50 mt-1">
                <span>{{ TRANSLATION_RANGES.x.min }}px</span>
                <span>0</span>
                <span>{{ TRANSLATION_RANGES.x.max }}px</span>
              </div>
            </div>

            <!-- Y Translation (in pixels relative to mainland center) -->
            <div class="mb-4">
              <label class="label">
                <span class="label-text">
                  <i class="ri-arrow-up-down-line" />
                  {{ t('territory.positionY') }}: {{ Math.round(translations[territory.code]?.y || 0) }}px
                </span>
              </label>
              <input
                type="range"
                :min="TRANSLATION_RANGES.y.min"
                :max="TRANSLATION_RANGES.y.max"
                :step="TRANSLATION_RANGES.y.step"
                :value="translations[territory.code]?.y || 0"
                class="range range-secondary range-xs"
                @input="updateTranslation(territory.code, 'y', $event)"
              >
              <div class="flex justify-between px-2 text-xs opacity-50 mt-1">
                <span>{{ TRANSLATION_RANGES.y.min }}px</span>
                <span>0</span>
                <span>{{ TRANSLATION_RANGES.y.max }}px</span>
              </div>
            </div>

            <!-- Scale -->
            <div class="mb-2">
              <label class="label">
                <span class="label-text">
                  <i class="ri-expand-diagonal-line" />
                  {{ t('territory.scale') }}: {{ scales[territory.code]?.toFixed(2) }}×
                </span>
              </label>
              <input
                type="range"
                :min="SCALE_RANGE.min"
                :max="SCALE_RANGE.max"
                :step="SCALE_RANGE.step"
                :value="scales[territory.code] || SCALE_RANGE.default"
                class="range range-accent range-xs"
                @input="updateScale(territory.code, $event)"
              >
              <div class="flex justify-between px-2 text-xs opacity-50 mt-1">
                <span>{{ SCALE_RANGE.min }}×</span>
                <span>{{ SCALE_RANGE.default }}×</span>
                <span>{{ SCALE_RANGE.max }}×</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div v-if="props.showTransformControls" class="mt-6 flex gap-2">
      <button
        class="btn btn-sm btn-outline"
        @click="resetToDefaults"
      >
        <i class="ri-restart-line" />
        {{ t('territory.resetButton') }}
      </button>
    </div>
  </div>
</template>
