<script setup lang="ts">
import type { SuggestedCompositionOptions } from '@/stores/composition'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import NewCompositionModal from '@/components/configuration/NewCompositionModal.vue'
import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import ImportControls from '@/components/ui/import/ImportControls.vue'
import GlobalProjectionControls from '@/components/ui/parameters/GlobalProjectionControls.vue'
import TerritoriesControl from '@/components/ui/parameters/TerritoriesControl.vue'
import PresetSelector from '@/components/ui/presets/PresetSelector.vue'
import Alert from '@/components/ui/primitives/Alert.vue'
import { useSelectedTerritory } from '@/composables/useSelectedTerritory'
import { useSuggestionOptions } from '@/composables/useSuggestionOptions'
import { useTerritoryTransforms } from '@/composables/useTerritoryTransforms'
import { useCompositionStore } from '@/stores/composition'

const { t } = useI18n()

const {
  shouldShowEmptyState,
  differsFromReference,
} = useTerritoryTransforms()

const { hasSelectedTerritory } = useSelectedTerritory()
const { arrangementOptions, scaleModeOptions } = useSuggestionOptions()
const compositionStore = useCompositionStore()

const showNewComposition = ref(false)

function updateSuggestion(options: Partial<SuggestedCompositionOptions>) {
  const suggestion = compositionStore.suggestedComposition
  if (suggestion) {
    compositionStore.startSuggestedComposition(suggestion.codes, { ...suggestion, ...options })
  }
}
</script>

<template>
  <div>
    <Alert
      v-if="shouldShowEmptyState"
      type="info"
    >
      {{ t('territory.noOverseas') }}
    </Alert>

    <div
      v-show="!hasSelectedTerritory"
      class="flex flex-col gap-3 mb-8"
    >
      <PresetSelector />
      <button
        type="button"
        class="btn btn-soft btn-primary btn-sm w-full"
        @click="showNewComposition = true"
      >
        <i class="ri-add-line" />
        {{ t('suggestion.newComposition') }}
      </button>

      <template v-if="compositionStore.suggestedComposition">
        <DropdownControl
          :model-value="compositionStore.suggestedComposition.arrangement"
          :label="t('suggestion.arrangement')"
          :options="arrangementOptions"
          icon="ri-layout-right-line"
          :disabled="differsFromReference"
          @update:model-value="updateSuggestion({ arrangement: $event as SuggestedCompositionOptions['arrangement'] })"
        />
        <DropdownControl
          :model-value="compositionStore.suggestedComposition.scaleMode"
          :label="t('suggestion.scaleMode')"
          :options="scaleModeOptions"
          icon="ri-zoom-in-line"
          :disabled="differsFromReference"
          @update:model-value="updateSuggestion({ scaleMode: $event as SuggestedCompositionOptions['scaleMode'] })"
        />
        <p
          v-if="differsFromReference"
          class="text-xs text-base-content/70"
        >
          {{ t('suggestion.adjusted') }}
        </p>
      </template>

      <ImportControls />
    </div>

    <div
      v-show="!hasSelectedTerritory"
      class="collapse collapse-arrow border-y rounded-none border-base-300 mb-6"
    >
      <input type="checkbox">
      <h3 class="collapse-title text-sm font-semibold pl-0">
        <i class="ri-square-line mr-1" />
        {{ t('projectionControls.global.title') }}
      </h3>
      <div class="collapse-content px-0">
        <GlobalProjectionControls />
      </div>
    </div>

    <TerritoriesControl />

    <NewCompositionModal v-model="showNewComposition" />
  </div>
</template>
