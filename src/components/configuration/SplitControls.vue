<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import TerritoriesControl from '@/components/ui/parameters/TerritoriesControl.vue'
import ViewPresetSelector from '@/components/ui/presets/ViewPresetSelector.vue'
import Alert from '@/components/ui/primitives/Alert.vue'
import { useTerritoryTransforms } from '@/composables/useTerritoryTransforms'

const { t } = useI18n()

const {
  shouldShowEmptyState,
} = useTerritoryTransforms()
</script>

<template>
  <div>
    <ViewPresetSelector />

    <div class="divider" />

    <h3 class="card-title mb-4">
      <i class="ri-shapes-line" />
      {{ t('territory.territorySettings') }}
    </h3>

    <!-- Message when no territories are available -->
    <Alert
      v-if="shouldShowEmptyState"
      type="info"
    >
      {{ t('territory.noOverseas') }}
    </Alert>

    <!-- Territory Settings -->
    <div v-if="!shouldShowEmptyState">
      <TerritoriesControl />
    </div>
  </div>
</template>
