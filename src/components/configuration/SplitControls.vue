<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import TerritoriesControl from '@/components/ui/parameters/TerritoriesControl.vue'
import ViewPresetSelector from '@/components/ui/presets/ViewPresetSelector.vue'
import Alert from '@/components/ui/primitives/Alert.vue'
import { useSelectedTerritory } from '@/composables/useSelectedTerritory'
import { useTerritoryTransforms } from '@/composables/useTerritoryTransforms'

const { t } = useI18n()

const {
  shouldShowEmptyState,
} = useTerritoryTransforms()

const { hasSelectedTerritory } = useSelectedTerritory()
</script>

<template>
  <div>
    <div v-show="!hasSelectedTerritory">
      <ViewPresetSelector />

      <div class="divider" />
    </div>

    <!-- Message when no territories are available -->
    <Alert
      v-if="shouldShowEmptyState"
      type="info"
    >
      {{ t('territory.noOverseas') }}
    </Alert>

    <TerritoriesControl v-else />
  </div>
</template>
