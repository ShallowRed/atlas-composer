<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import ThemeSelector from '@/components/ui/settings/ThemeSelector.vue'
import { getAvailableAtlasesGrouped } from '@/core/atlases/registry'
import { useConfigStore } from '@/stores/config'
import { getAtlasFlag } from '@/utils/atlas-icons'
import { getViewModeIcon } from '@/utils/view-mode-icons'

interface Props {
  allowThemeSelection?: boolean
  viewModeOptions: Array<{ value: string, label: string }>
}
const props = withDefaults(defineProps<Props>(), {
  allowThemeSelection: false,
})
const { t } = useI18n()
const configStore = useConfigStore()

// Get grouped atlases with translated category labels and flags
const atlasGroupsWithIcons = computed(() => {
  return getAvailableAtlasesGrouped().map(group => ({
    label: t(`atlas.categories.${group.category}`),
    options: group.options.map(atlas => ({
      ...atlas,
      icon: getAtlasFlag(atlas.value),
    })),
  }))
})

// Add icons to view mode options
const viewModeOptionsWithIcons = computed(() => {
  return props.viewModeOptions.map(mode => ({
    ...mode,
    icon: getViewModeIcon(mode.value as any),
  }))
})

// Determine if territory selector should be disabled
const isTerritorySelectDisabled = computed(() => {
  // Disable if atlas doesn't have territory selector capability
  if (!configStore.currentAtlasConfig?.hasTerritorySelector) {
    return true
  }
  // Disable for composite-existing mode (built-in projections don't support selective territories)
  return !configStore.showTerritorySelector
})

// Determine if projection mode toggle should be disabled
const isProjectionModeDisabled = computed(() => {
  return !configStore.showProjectionModeToggle
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Theme Selector -->
    <ThemeSelector v-if="allowThemeSelection" />

    <!-- Region Selector -->
    <DropdownControl
      v-model="configStore.selectedAtlas"
      :label="t('settings.region')"
      icon="ri-map-2-line"
      :option-groups="atlasGroupsWithIcons"
    />

    <!-- Territory Selection (for composite modes) -->
    <DropdownControl
      v-if="configStore.currentAtlasConfig?.hasTerritorySelector"
      v-model="configStore.territoryMode"
      :label="t('mode.select')"
      icon="ri-map-pin-range-line"
      :disabled="isTerritorySelectDisabled"
      :options="configStore.currentAtlasConfig?.territoryModeOptions || []"
    />
    <!-- Main View Mode Selector -->
    <DropdownControl
      v-model="configStore.viewMode"
      :label="t('mode.view')"
      icon="ri-layout-grid-line"
      :disabled="configStore.isViewModeLocked"
      :options="viewModeOptionsWithIcons"
    />

    <!-- Projection Mode Toggle (for split and composite-custom modes) -->
    <DropdownControl
      v-model="configStore.projectionMode"
      :label="t('projection.mode')"
      icon="ri-global-line"
      :disabled="isProjectionModeDisabled"
      :options="[
        { value: 'uniform', label: t('projection.uniform'), translated: true, icon: 'ri-equal-line' },
        { value: 'individual', label: t('projection.individual'), translated: true, icon: 'ri-list-view' },
      ]"
    />
  </div>
</template>
