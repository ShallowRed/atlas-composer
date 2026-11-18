<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ImportControls from '@/components/ui/import/ImportControls.vue'
import GlobalProjectionControls from '@/components/ui/parameters/GlobalProjectionControls.vue'
import TerritoriesControl from '@/components/ui/parameters/TerritoriesControl.vue'
import PresetSelector from '@/components/ui/presets/PresetSelector.vue'
import { useSelectedTerritory } from '@/composables/useSelectedTerritory'

const { t } = useI18n()

const { hasSelectedTerritory } = useSelectedTerritory()
</script>

<template>
  <div>
    <div
      v-show="!hasSelectedTerritory"
      class="flex flex-col gap-3 mb-8"
    >
      <PresetSelector />
      <ImportControls />
    </div>

    <div
      v-show="!hasSelectedTerritory"
      class="collapse collapse-arrow border-y rounded-none border-base-300 mb-6"
    >
      <input type="checkbox">
      <h3 class="collapse-title text-sm font-semibold pl-0">
        <i class="ri-square-line mr-1" />
        {{ t('projectionControls.global.title') }}
      </h3>
      <div class="collapse-content px-0">
        <GlobalProjectionControls />
      </div>
    </div>

    <TerritoriesControl>
      <template #empty>
        <p class="text-sm text-base-content/70">
          {{ t('territory.blankCanvas.empty') }}
        </p>
      </template>
    </TerritoriesControl>
  </div>
</template>
