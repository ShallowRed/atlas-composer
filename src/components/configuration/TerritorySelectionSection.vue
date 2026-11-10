<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import TerritorySetManager from '@/components/ui/parameters/TerritorySetManager.vue'
import { useTerritoryModeOptions } from '@/composables/useTerritoryModeOptions'
import { useViewState } from '@/composables/useViewState'
import { useViewStore } from '@/stores/view'

const { t } = useI18n()
const viewStore = useViewStore()
const { viewOrchestration, isCompositeCustomMode } = useViewState()
const { options: territoryModeOptions } = useTerritoryModeOptions()
</script>

<template>
  <div class="collapse collapse-arrow border-y rounded-none border-base-300">
    <input type="checkbox">
    <div class="collapse-title text-sm flex items-center gap-2 font-semibold pl-0">
      <i class="ri-map-pin-range-line" />
      <span>{{ t('mode.select') }}</span>
    </div>
    <div class="collapse-content px-0">
      <DropdownControl
        v-if="viewOrchestration.shouldShowTerritorySelector.value"
        v-model="viewStore.territoryMode"
        :label="t('mode.select')"
        icon="ri-map-pin-range-line"
        :options="territoryModeOptions"
      />
      <TerritorySetManager v-if="isCompositeCustomMode" />
    </div>
  </div>
</template>
