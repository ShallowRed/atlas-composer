<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Alert from '@/components/ui/Alert.vue'
import ProjectionSelector from '@/components/ui/ProjectionSelector.vue'
import RangeSlider from '@/components/ui/RangeSlider.vue'
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

// Event handlers that call composable functions directly
function updateTranslationX(territoryCode: string, value: number) {
  setTerritoryTranslation(territoryCode, 'x', value)
}

function updateTranslationY(territoryCode: string, value: number) {
  setTerritoryTranslation(territoryCode, 'y', value)
}

function updateScale(territoryCode: string, value: number) {
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
    <Alert v-if="territories.length === 0 && !(projectionMode === 'individual' && (showMainland || isMainlandInTerritories))" type="info">
      {{ t('territory.noOverseas') }}
    </Alert>

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
              <RangeSlider
                :model-value="translations[territory.code]?.x || 0"
                :label="t('territory.positionX')"
                icon="ri-arrow-left-right-line"
                :min="TRANSLATION_RANGES.x.min"
                :max="TRANSLATION_RANGES.x.max"
                :step="TRANSLATION_RANGES.x.step"
                unit="px"
                @update:model-value="(value) => updateTranslationX(territory.code, value)"
              />
            </div>

            <!-- Y Translation (in pixels relative to mainland center) -->
            <div class="mb-4">
              <RangeSlider
                :model-value="translations[territory.code]?.y || 0"
                :label="t('territory.positionY')"
                icon="ri-arrow-up-down-line"
                :min="TRANSLATION_RANGES.y.min"
                :max="TRANSLATION_RANGES.y.max"
                :step="TRANSLATION_RANGES.y.step"
                unit="px"
                color="secondary"
                @update:model-value="(value) => updateTranslationY(territory.code, value)"
              />
            </div>

            <!-- Scale -->
            <div class="mb-2">
              <RangeSlider
                :model-value="scales[territory.code] || SCALE_RANGE.default"
                :label="t('territory.scale')"
                icon="ri-expand-diagonal-line"
                :min="SCALE_RANGE.min"
                :max="SCALE_RANGE.max"
                :step="SCALE_RANGE.step"
                unit="×"
                color="accent"
                :decimals="2"
                @update:model-value="(value) => updateScale(territory.code, value)"
              />
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
