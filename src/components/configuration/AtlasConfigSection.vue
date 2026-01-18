<script setup lang="ts">
import type { AtlasId } from '@/types/branded'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import TerritorySetManager from '@/components/ui/parameters/TerritorySetManager.vue'
import { useTerritoryModeOptions } from '@/composables/useTerritoryModeOptions'
import { useViewMode } from '@/composables/useViewMode'
import { useViewState } from '@/composables/useViewState'
import { getAvailableAtlasesGrouped } from '@/core/atlases/registry'
import { useAtlasStore } from '@/stores/atlas'
import { useViewStore } from '@/stores/view'
import { getAtlasFlag } from '@/utils/atlas-icons'
import { getViewModeIcon } from '@/utils/view-mode-icons'

const { viewModeOptions } = useViewMode()
const { viewOrchestration } = useViewState()

const { t } = useI18n()
const atlasStore = useAtlasStore()
const viewStore = useViewStore()

const { options: territoryModeOptions } = useTerritoryModeOptions()

const atlasGroupsWithIcons = computed(() => {
  return getAvailableAtlasesGrouped().map(group => ({
    label: group.label, // Already translated by registry
    options: group.options.map(atlas => ({
      ...atlas,
      icon: getAtlasFlag(atlas.value as AtlasId),
    })),
  }))
})

const viewModeOptionsWithIcons = computed(() => {
  return viewModeOptions.value.map(mode => ({
    ...mode,
    icon: getViewModeIcon(mode.value as any),
  }))
})
const { isCompositeCustomMode } = useViewState()
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Region Selector -->
    <DropdownControl
      v-model="atlasStore.selectedAtlasId"
      :label="t('settings.region')"
      icon="ri-map-2-line"
      :option-groups="atlasGroupsWithIcons"
    />
    <!-- Main View Mode Selector -->
    <DropdownControl
      v-model="viewStore.viewMode"
      :label="t('mode.view')"
      icon="ri-layout-grid-line"
      :disabled="viewOrchestration.isViewModeDisabled.value"
      :options="viewModeOptionsWithIcons"
    />
    <!-- Territory Selection (collapsible) -->
    <div
      v-if="viewOrchestration.shouldShowTerritorySelector.value || isCompositeCustomMode"
      class="collapse collapse-arrow border-y rounded-none border-base-300"
    >
      <input
        type="checkbox"
      >
      <div class="collapse-title text-sm font-medium flex items-center gap-2">
        <i class="ri-map-pin-range-line" />
        <span>{{ t('mode.select') }}</span>
      </div>
      <div class="collapse-content">
        <!-- Territory Selection (for unified and split modes) -->
        <DropdownControl
          v-if="viewOrchestration.shouldShowTerritorySelector.value"
          v-model="viewStore.territoryMode"
          :label="t('mode.select')"
          icon="ri-map-pin-range-line"
          :options="territoryModeOptions"
        />
        <!-- Territory Set Manager (for composite-custom mode) -->
        <TerritorySetManager v-if="isCompositeCustomMode" />
      </div>
    </div>
  </div>
</template>
