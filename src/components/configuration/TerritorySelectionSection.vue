<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import TerritorySetManager from '@/components/ui/parameters/TerritorySetManager.vue'
import { useTerritoryModeOptions } from '@/composables/useTerritoryModeOptions'
import { useViewState } from '@/composables/useViewState'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'
import { useViewStore } from '@/stores/view'

const { t } = useI18n()
const viewStore = useViewStore()
const { viewOrchestration, isCompositeCustomMode } = useViewState()
const { options: territoryModeOptions } = useTerritoryModeOptions()
const presetDefaults = usePresetDefaultsStore()

const isOpen = ref(false)
watch(() => isCompositeCustomMode.value && presetDefaults.isBlank && viewStore.activeTerritoryCodes.size === 0, (isEmpty) => {
  if (isEmpty) {
    isOpen.value = true
  }
}, { immediate: true })
</script>

<template>
  <div class="collapse collapse-arrow border-y rounded-none border-base-300">
    <input
      v-model="isOpen"
      type="checkbox"
    >
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
      <TerritorySetManager
        v-if="isCompositeCustomMode"
        :available-only="presetDefaults.isBlank"
      />
    </div>
  </div>
</template>
