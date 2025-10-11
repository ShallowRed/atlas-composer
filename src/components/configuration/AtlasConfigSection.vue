<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SelectControl from '@/components/ui/SelectControl.vue'
import ThemeSelector from '@/components/ui/ThemeSelector.vue'
import { getAvailableAtlases } from '@/core/atlases/registry'
import { useConfigStore } from '@/stores/config'

interface Props {
  allowThemeSelection?: boolean
  compositeProjectionOptions: Array<{ value: string, label: string }>
  viewModeOptions: Array<{ value: string, label: string }>
}
withDefaults(defineProps<Props>(), {
  allowThemeSelection: false,
})
const { t } = useI18n()
const configStore = useConfigStore()
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Theme Selector -->
    <ThemeSelector v-if="allowThemeSelection" />

    <!-- Region Selector -->
    <SelectControl
      v-model="configStore.selectedAtlas"
      :label="t('settings.region')"
      icon="ri-map-2-line"
      :options="getAvailableAtlases()"
    />

    <!-- Territory Selection (for composite modes) -->
    <SelectControl
      v-show="configStore.showTerritorySelector && configStore.currentAtlasConfig?.hasTerritorySelector"
      v-model="configStore.territoryMode"
      :label="t('mode.select')"
      icon="ri-map-pin-range-line"
      :options="configStore.currentAtlasConfig?.territoryModeOptions || []"
    />
    <!-- Main View Mode Selector -->
    <SelectControl
      v-model="configStore.viewMode"
      :label="t('mode.view')"
      icon="ri-layout-grid-line"
      :disabled="configStore.isViewModeLocked"
      :options="viewModeOptions"
    />

    <!-- Composite Projection Selector (for composite-existing mode) -->
    <SelectControl
      v-show="configStore.showCompositeProjectionSelector && compositeProjectionOptions.length > 0"
      v-model="configStore.compositeProjection"
      :label="t('projection.composite')"
      icon="ri-global-line"
      :options="compositeProjectionOptions"
    />

    <!-- Projection Mode Toggle (for split and composite-custom modes) -->
    <SelectControl
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
