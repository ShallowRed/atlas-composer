<script setup lang="ts">
import type { ViewMode } from '@/types'
import type { AtlasId } from '@/types/branded'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import { useAtlasGroups } from '@/composables/useAtlasGroups'
import { useViewMode } from '@/composables/useViewMode'
import { useViewState } from '@/composables/useViewState'
import { useAtlasStore } from '@/stores/atlas'
import { useCompositionStore } from '@/stores/composition'
import { useViewStore } from '@/stores/view'
import { getViewModeIcon } from '@/utils/view-modes'

const { viewModeOptions } = useViewMode()
const { viewOrchestration } = useViewState()

const { t } = useI18n()
// Below xl, the map column is too narrow for the two selectors and the actions on one row
const isBelowXl = useBreakpoints(breakpointsTailwind).smaller('xl')
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
  <!-- The actions slot is rendered at two places so that the DOM order follows the visual order: after the atlas below xl, where the view selector takes its own row, after the view selector from xl -->
  <div class="flex flex-wrap items-start gap-x-3 gap-y-2 xl:flex-nowrap">
    <DropdownControl
      class="min-w-0 lg:w-56"
      hide-label
      :model-value="atlasStore.selectedAtlasId"
      :label="t('settings.region')"
      icon="ri-map-2-line"
      :option-groups="atlasGroupsWithIcons"
      @update:model-value="compositionStore.selectAtlas($event as AtlasId)"
    />
    <div
      v-if="isBelowXl"
      class="ml-auto"
    >
      <slot name="actions" />
    </div>
    <DropdownControl
      class="min-w-0 max-xl:basis-full xl:w-80 xl:flex-none"
      hide-label
      :model-value="viewStore.viewMode"
      :label="t('mode.view')"
      icon="ri-layout-grid-line"
      :disabled="viewOrchestration.isViewModeDisabled.value"
      :options="viewModeOptionsWithIcons"
      @update:model-value="compositionStore.selectViewMode($event as ViewMode)"
    />
    <div
      v-if="!isBelowXl"
      class="ml-auto"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
