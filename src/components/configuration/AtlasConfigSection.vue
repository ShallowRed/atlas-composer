<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FormControl from '@/components/ui/FormControl.vue'
import ThemeSelector from '@/components/ui/ThemeSelector.vue'
import { getAvailableAtlases } from '@/core/atlases/registry'
import { useConfigStore } from '@/stores/config'

interface Props {
  allowThemeSelection?: boolean
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
    <FormControl
      v-model="configStore.selectedAtlas"
      :label="t('settings.region')"
      icon="ri-map-2-line"
      type="select"
      :options="getAvailableAtlases()"
    />

    <!-- Territory Selection (for composite modes) -->
    <FormControl
      v-show="configStore.showTerritorySelector && configStore.currentAtlasConfig?.hasTerritorySelector"
      v-model="configStore.territoryMode"
      :label="t('mode.select')"
      icon="ri-map-pin-range-line"
      type="select"
      :options="configStore.currentAtlasConfig?.territoryModeOptions || []"
    />
  </div>
</template>
