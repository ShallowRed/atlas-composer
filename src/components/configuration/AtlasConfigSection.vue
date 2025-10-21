<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DropdownControl from '@/components/ui/forms/DropdownControl.vue'

import TerritorySetManager from '@/components/ui/parameters/TerritorySetManager.vue'
import { useTerritoryModeOptions } from '@/composables/useTerritoryModeOptions'
import { useViewMode } from '@/composables/useViewMode'
import { useViewState } from '@/composables/useViewState'
import { getAvailableAtlasesGrouped } from '@/core/atlases/registry'
import { useConfigStore } from '@/stores/config'
import { getAtlasFlag } from '@/utils/atlas-icons'
import { getViewModeIcon } from '@/utils/view-mode-icons'

const { viewModeOptions } = useViewMode()
const { viewOrchestration } = useViewState()

const { t } = useI18n()
const configStore = useConfigStore()

// Get territory mode options with reactive translation
const { options: territoryModeOptions } = useTerritoryModeOptions()

// Get grouped atlases with translated labels and flags
const atlasGroupsWithIcons = computed(() => {
  return getAvailableAtlasesGrouped().map(group => ({
    label: group.label, // Already translated by registry
    options: group.options.map(atlas => ({
      ...atlas,
      icon: getAtlasFlag(atlas.value),
    })),
  }))
})

// Add icons to view mode options
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
      v-model="configStore.selectedAtlas"
      :label="t('settings.region')"
      icon="ri-map-2-line"
      :option-groups="atlasGroupsWithIcons"
    />
    <!-- Main View Mode Selector -->
    <DropdownControl
      v-model="configStore.viewMode"
      :label="t('mode.view')"
      icon="ri-layout-grid-line"
      :disabled="viewOrchestration.isViewModeDisabled.value"
      :options="viewModeOptionsWithIcons"
    />
    <!-- Territory Selection (for unified and split modes) -->
    <DropdownControl
      v-if="viewOrchestration.shouldShowTerritorySelector.value"
      v-model="configStore.territoryMode"
      :label="t('mode.select')"
      icon="ri-map-pin-range-line"
      :options="territoryModeOptions"
    />
    <!-- Territory Set Manager (for composite-custom mode) -->
    <div v-if="isCompositeCustomMode">
      <div class="text-sm font-medium text-base-content mb-3 flex items-center gap-2">
        <i class="ri-map-pin-range-line" />
        <span>{{ t('mode.select') }}</span>
      </div>
      <TerritorySetManager />
    </div>
  </div>
</template>
