<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import ThemeSelector from '@/components/ui/settings/ThemeSelector.vue'
import { getAvailableAtlases } from '@/core/atlases/registry'
import { useConfigStore } from '@/stores/config'
import { getAtlasFlag } from '@/utils/atlas-icons'
import { getViewModeIcon } from '@/utils/view-mode-icons'

interface Props {
  allowThemeSelection?: boolean
  compositeProjectionOptions: Array<{ value: string, label: string }>
  viewModeOptions: Array<{ value: string, label: string }>
}
const props = withDefaults(defineProps<Props>(), {
  allowThemeSelection: false,
})
const { t } = useI18n()
const configStore = useConfigStore()

// Add flags to atlas options
const atlasOptionsWithIcons = computed(() => {
  return getAvailableAtlases().map(atlas => ({
    ...atlas,
    icon: getAtlasFlag(atlas.value),
  }))
})

// Add icons to view mode options
const viewModeOptionsWithIcons = computed(() => {
  return props.viewModeOptions.map(mode => ({
    ...mode,
    icon: getViewModeIcon(mode.value as any),
  }))
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
      :options="atlasOptionsWithIcons"
    />

    <!-- Territory Selection (for composite modes) -->
    <DropdownControl
      v-show="configStore.showTerritorySelector && configStore.currentAtlasConfig?.hasTerritorySelector"
      v-model="configStore.territoryMode"
      :label="t('mode.select')"
      icon="ri-map-pin-range-line"
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

    <!-- Composite Projection Selector (for composite-existing mode) -->
    <DropdownControl
      v-show="configStore.showCompositeProjectionSelector && compositeProjectionOptions.length > 0"
      v-model="configStore.compositeProjection"
      :label="t('projection.composite')"
      icon="ri-global-line"
      :options="compositeProjectionOptions"
    />

    <!-- Projection Mode Toggle (for split and composite-custom modes) -->
    <DropdownControl
      v-show="configStore.showProjectionModeToggle"
      v-model="configStore.projectionMode"
      :label="t('projection.mode')"
      icon="ri-global-line"
      :options="[
        { value: 'uniform', label: t('projection.uniform') },
        { value: 'individual', label: t('projection.individual') },
      ]"
    />
  </div>
</template>
