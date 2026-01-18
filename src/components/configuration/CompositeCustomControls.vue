<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ImportControls from '@/components/ui/import/ImportControls.vue'
import GlobalProjectionControls from '@/components/ui/parameters/GlobalProjectionControls.vue'
import TerritoriesControl from '@/components/ui/parameters/TerritoriesControl.vue'
import PresetSelector from '@/components/ui/presets/PresetSelector.vue'
import Alert from '@/components/ui/primitives/Alert.vue'
import { useTerritoryTransforms } from '@/composables/useTerritoryTransforms'

const { t } = useI18n()

const {
  shouldShowEmptyState,
} = useTerritoryTransforms()
</script>

<template>
  <div>
    <Alert
      v-if="shouldShowEmptyState"
      type="info"
    >
      {{ t('territory.noOverseas') }}
    </Alert>

    <div class="flex flex-col gap-3 mb-8">
      <PresetSelector />
      <ImportControls />
    </div>

    <div class="collapse collapse-arrow border-t rounded-none border-base-300">
      <input type="checkbox">
      <h3 class="collapse-title text-sm font-semibold pl-0">
        <i class="ri-square-line mr-1" />
        {{ t('projectionControls.global.title') }}
      </h3>
      <div class="collapse-content pl-0">
        <GlobalProjectionControls />
      </div>
    </div>

    <div class="collapse collapse-arrow border-y rounded-none border-base-300">
      <input type="checkbox">
      <h3 class="collapse-title text-sm font-semibold pl-0">
        <i class="ri-shapes-line mr-1" />
        {{ t('territory.territorySettings') }}
      </h3>
      <div class="collapse-content pl-0">
        <TerritoriesControl />
      </div>
    </div>
  </div>
</template>
