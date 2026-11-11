<script setup lang="ts">
import type { ViewMode } from '@/types'
import type { AtlasId } from '@/types/branded'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import { useAtlasGroups } from '@/composables/useAtlasGroups'
import { useViewMode } from '@/composables/useViewMode'
import { useViewState } from '@/composables/useViewState'
import { useAtlasStore } from '@/stores/atlas'
import { useCompositionStore } from '@/stores/composition'
import { useViewStore } from '@/stores/view'
import { getViewModeIcon } from '@/utils/view-mode-icons'

const { viewModeOptions } = useViewMode()
const { viewOrchestration } = useViewState()

const { t } = useI18n()
const atlasStore = useAtlasStore()
const compositionStore = useCompositionStore()
const viewStore = useViewStore()

const { atlasGroups } = useAtlasGroups()

const atlasGroupsWithIcons = computed(() => atlasGroups.value.map(group => ({
  label: group.label,
  options: group.options.map(atlas => ({ ...atlas, translated: true })),
})))

const viewModeOptionsWithIcons = computed(() => {
  return viewModeOptions.value.map(mode => ({
    ...mode,
    icon: getViewModeIcon(mode.value as any),
  }))
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
    <DropdownControl
      class="w-44 sm:w-56"
      hide-label
      :model-value="atlasStore.selectedAtlasId"
      :label="t('settings.region')"
      icon="ri-map-2-line"
      :option-groups="atlasGroupsWithIcons"
      @update:model-value="compositionStore.selectAtlas($event as AtlasId)"
    />
    <DropdownControl
      class="w-full sm:w-80"
      hide-label
      :model-value="viewStore.viewMode"
      :label="t('mode.view')"
      icon="ri-layout-grid-line"
      :disabled="viewOrchestration.isViewModeDisabled.value"
      :options="viewModeOptionsWithIcons"
      @update:model-value="compositionStore.selectViewMode($event as ViewMode)"
    />
  </div>
</template>
