<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import RangeSlider from '@/components/ui/forms/RangeSlider.vue'
import ToggleControl from '@/components/ui/forms/ToggleControl.vue'
import ImportControls from '@/components/ui/import/ImportControls.vue'
import AccordionItem from '@/components/ui/primitives/AccordionItem.vue'
import Alert from '@/components/ui/primitives/Alert.vue'
import ProjectionDropdown from '@/components/ui/projections/ProjectionDropdown.vue'
import { useTerritoryTransforms } from '@/composables/useTerritoryTransforms'
import { useConfigStore } from '@/stores/config'

const props = withDefaults(defineProps<Props>(), {
  showTransformControls: true,
})

const { t } = useI18n()

interface Props {
  showTransformControls?: boolean // Show translation/scale controls (false for split mode)
}
const configStore = useConfigStore()
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
</script>

<template>
  <div>
    <!-- Message when no territories are available (and no mainland in individual mode) -->
    <Alert
      v-if="territories.length === 0 && !(projectionMode === 'individual' && (showMainland || isMainlandInTerritories))"
      type="info"
    >
      {{ t('territory.noOverseas') }}
    </Alert>
    <div
      v-else
      class="flex flex-col gap-4"
    >
      <ImportControls />
      <button
        class="btn btn-sm btn-soft"
        @click="resetToDefaults"
      >
        <i class="ri-restart-line" />
        {{ t('territory.resetButton') }}
      </button>
      <ToggleControl
        v-show="configStore.showScalePreservation"
        v-model="configStore.scalePreservation"
        :label="t('territory.scalePreservation')"
      />
      <!-- Accordion for all territories -->
      <div class="join join-vertical w-full">
        <!-- Mainland section (shown when has mainland config OR when mainland is in territories list) -->
        <AccordionItem
          v-if="projectionMode === 'individual' && (showMainland || isMainlandInTerritories)"
          :title="t(currentAtlasConfig.splitModeConfig?.mainlandTitle || 'territory.mainland')"
          :subtitle="mainlandCode"
          group-name="territory-accordion"
          :checked="true"
        >
          <!-- Projection Selector -->
          <div class="mb-4">
            <ProjectionDropdown
              :model-value="territoryProjections[mainlandCode] || selectedProjection"
              :label="t('projection.cartographic')"
              :projection-groups="projectionGroups"
              :recommendations="projectionRecommendations"
              @update:model-value="(value: string) => setTerritoryProjection(mainlandCode, value)"
            />
          </div>
        </AccordionItem>

        <!-- Overseas territories (excluding mainland to avoid duplication) -->
        <AccordionItem
          v-for="(territory, index) in territories.filter(t => t.code !== mainlandCode)"
          :key="territory.code"
          :title="territory.name"
          :subtitle="territory.code"
          group-name="territory-accordion"
          :checked="projectionMode === 'uniform' && index === 0"
        >
          <!-- Projection Selector (always shown in individual mode) -->
          <div
            v-if="projectionMode === 'individual'"
            class="mb-4"
          >
            <ProjectionDropdown
              :model-value="territoryProjections[territory.code] || selectedProjection"
              :label="t('projection.cartographic')"
              :projection-groups="projectionGroups"
              :recommendations="projectionRecommendations"
              @update:model-value="(value: string) => setTerritoryProjection(territory.code, value)"
            />
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
        </AccordionItem>
      </div>
    </div>
  </div>
</template>
