<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

const { t } = useI18n()
const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()

// Get all territories that were loaded from the preset
// (These are the territories we have data for)
const loadedTerritories = computed(() => {
  return geoDataStore.overseasTerritoriesData
})

// Get territories that are currently active (included in composite)
const activeTerritories = computed(() => {
  return geoDataStore.filteredTerritories
})

// Get territories that are available to add (not currently active, excluding mainland)
// Only show territories that were loaded from the preset (we have data for them)
const availableTerritories = computed(() => {
  const activeCodes = new Set(activeTerritories.value.map(t => t.code))
  const mainlandCode = configStore.currentAtlasConfig?.splitModeConfig?.mainlandCode

  return loadedTerritories.value.filter(t =>
    !activeCodes.has(t.code) && t.code !== mainlandCode,
  )
})

function addTerritory(code: string) {
  // Territory is already in the preset, so it has parameters
  // Just add it to the active set
  configStore.addTerritoryToComposite(code)

  // Trigger re-render
  geoDataStore.triggerRender()
}

function removeTerritory(code: string) {
  configStore.removeTerritoryFromComposite(code)
  // Trigger re-render
  geoDataStore.triggerRender()
}
</script>

<template>
  <div class="space-y-4">
    <!-- Active Territories -->
    <div>
      <div class="text-xs text-base-content/60 mb-2">
        {{ t('territory.setManager.active', 'Active territories') }} ({{ activeTerritories.length }})
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="territory in activeTerritories"
          :key="territory.code"
          class="btn btn-xs btn-soft"
          :title="t('territory.setManager.remove', 'Click to remove')"
          @click="removeTerritory(territory.code)"
        >
          {{ territory.name }}
          <i class="ri-close-line text-error" />
        </button>
        <div
          v-if="activeTerritories.length === 0"
          class="text-xs text-base-content/40 italic"
        >
          {{ t('territory.setManager.noActive', 'No territories selected') }}
        </div>
      </div>
    </div>

    <!-- Available Territories -->
    <div v-if="availableTerritories.length > 0">
      <div class="text-xs text-base-content/60 mb-2">
        {{ t('territory.setManager.available', 'Available to Add') }} ({{ availableTerritories.length }})
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="territory in availableTerritories"
          :key="territory.code"
          class="btn btn-xs btn-ghost"
          :title="t('territory.setManager.add', 'Click to add')"
          @click="addTerritory(territory.code)"
        >
          <i class="ri-add-line text-success" />
          {{ territory.name }}
        </button>
      </div>
    </div>
  </div>
</template>
