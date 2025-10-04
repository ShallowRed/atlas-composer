<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '@/stores/config'

interface Props {
  showTransformControls?: boolean // Show translation/scale controls (false for split mode)
}

const props = withDefaults(defineProps<Props>(), {
  showTransformControls: true,
})

const configStore = useConfigStore()

// All possible territories with their names
const allTerritories = [
  { code: 'FR-GF', name: 'Guyane française' },
  { code: 'FR-RE', name: 'La Réunion' },
  { code: 'FR-GP', name: 'Guadeloupe' },
  { code: 'FR-MQ', name: 'Martinique' },
  { code: 'FR-YT', name: 'Mayotte' },
  { code: 'FR-MF', name: 'Saint-Martin' },
  { code: 'FR-PF', name: 'Polynésie française' },
  { code: 'FR-NC', name: 'Nouvelle-Calédonie' },
  { code: 'FR-TF', name: 'Terres australes et antarctiques françaises' },
  { code: 'FR-WF', name: 'Wallis-et-Futuna' },
  { code: 'FR-PM', name: 'Saint-Pierre-et-Miquelon' },
]

// Filter territories based on selected mode
const territories = computed(() => {
  const mode = configStore.territoryMode
  let codes: string[] = []

  switch (mode) {
    case 'metropole-only':
      codes = []
      break
    case 'metropole-major':
      codes = ['FR-GF', 'FR-RE', 'FR-GP', 'FR-MQ', 'FR-YT']
      break
    case 'metropole-uncommon':
      codes = ['FR-GF', 'FR-RE', 'FR-GP', 'FR-MQ', 'FR-YT', 'FR-MF', 'FR-PF', 'FR-NC']
      break
    case 'all-territories':
      codes = ['FR-GF', 'FR-RE', 'FR-GP', 'FR-MQ', 'FR-YT', 'FR-MF', 'FR-PF', 'FR-NC', 'FR-TF', 'FR-WF', 'FR-PM']
      break
    default:
      codes = ['FR-GF', 'FR-RE', 'FR-GP', 'FR-MQ', 'FR-YT']
  }

  return allTerritories.filter(t => codes.includes(t.code))
})

const translations = computed(() => configStore.territoryTranslations)
const scales = computed(() => configStore.territoryScales)

function updateTranslation(territoryCode: string, axis: 'x' | 'y', event: Event) {
  const value = Number.parseFloat((event.target as HTMLInputElement).value)
  configStore.setTerritoryTranslation(territoryCode, axis, value)
}

function updateScale(territoryCode: string, event: Event) {
  const value = Number.parseFloat((event.target as HTMLInputElement).value)
  configStore.setTerritoryScale(territoryCode, value)
}

function resetToDefaults() {
  // Default translations (major territories have custom positions, others are centered)
  const defaults = {
    'FR-GF': { x: -8, y: -2 },
    'FR-RE': { x: -10, y: 3 },
    'FR-GP': { x: -8, y: 1 },
    'FR-MQ': { x: -8.5, y: 2.5 },
    'FR-YT': { x: -2, y: -5 },
    'FR-MF': { x: 0, y: 0 },
    'FR-PF': { x: 0, y: 0 },
    'FR-NC': { x: 0, y: 0 },
    'FR-TF': { x: 0, y: 0 },
    'FR-WF': { x: 0, y: 0 },
    'FR-PM': { x: 0, y: 0 },
  }

  // Reset translations for all territories
  Object.entries(defaults).forEach(([code, { x, y }]) => {
    configStore.setTerritoryTranslation(code, 'x', x)
    configStore.setTerritoryTranslation(code, 'y', y)
  })

  // Reset scales for all territories
  allTerritories.forEach((t) => {
    configStore.setTerritoryScale(t.code, 1.0)
  })
}
</script>

<template>
  <div class="territory-translation-controls p-4 bg-base-200 rounded-lg overflow-y-auto max-h-screen border border-base-300">
    <h3 class="text-lg font-semibold mb-4">
      <i class="ri-settings-4-line" />
      Paramètres par territoire
    </h3>

    <!-- Message when no territories are available -->
    <div v-if="territories.length === 0" class="alert alert-info">
      <i class="ri-information-line" />
      <span>Aucun territoire d'outre-mer à ajuster. Sélectionnez un mode incluant des DOM-TOM dans "Territoires à inclure".</span>
    </div>

    <!-- Accordion for all territories -->
    <div v-else class="join join-vertical w-full">
      <!-- Metropolitan France (only in individual mode) -->
      <div
        v-if="configStore.projectionMode === 'individual'"
        class="collapse collapse-arrow join-item border bg-base-100 border-base-300"
      >
        <input
          type="radio"
          name="territory-accordion"
          checked
        >
        <div class="collapse-title font-semibold">
          France Métropolitaine <span class="text-sm opacity-60">(FR-MET)</span>
        </div>
        <div class="collapse-content">
          <!-- Projection Selector -->
          <div class="mb-4">
            <label class="label">
              <span class="label-text text-sm font-medium">
                <i class="ri-global-line" />
                Projection cartographique
              </span>
            </label>
            <select
              :value="configStore.territoryProjections['FR-MET'] || configStore.selectedProjection"
              class="select select-sm w-full cursor-pointer"
              @change="(e) => {
                configStore.setTerritoryProjection('FR-MET', (e.target as HTMLSelectElement).value)
              }"
            >
              <optgroup
                v-for="group in configStore.projectionGroups"
                :key="group.category"
                :label="group.category"
              >
                <option
                  v-for="option in group.options"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      <!-- DOM-TOM Territories -->
      <div
        v-for="(territory, index) in territories"
        :key="territory.code"
        class="collapse collapse-arrow join-item border bg-base-100 border-base-300"
      >
        <input
          type="radio"
          name="territory-accordion"
          :checked="configStore.projectionMode === 'uniform' && index === 0"
        >
        <div class="collapse-title font-semibold">
          {{ territory.name }} <span class="text-sm opacity-60">({{ territory.code }})</span>
        </div>
        <div class="collapse-content">
          <!-- Projection Selector (always shown in individual mode) -->
          <div v-if="configStore.projectionMode === 'individual'" class="mb-4">
            <label class="label">
              <span class="label-text text-sm font-medium">
                <i class="ri-global-line" />
                Projection cartographique
              </span>
            </label>
            <select
              :value="configStore.territoryProjections[territory.code] || configStore.selectedProjection"
              class="select select-sm w-full cursor-pointer"
              @change="(e) => {
                configStore.setTerritoryProjection(territory.code, (e.target as HTMLSelectElement).value)
              }"
            >
              <optgroup
                v-for="group in configStore.projectionGroups"
                :key="group.category"
                :label="group.category"
              >
                <option
                  v-for="option in group.options"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </optgroup>
            </select>
          </div>

          <!-- Transform Controls (hidden in split mode) -->
          <template v-if="props.showTransformControls">
            <!-- X Translation -->
            <div class="mb-4">
              <label class="label">
                <span class="label-text text-sm font-medium">
                  <i class="ri-arrow-left-right-line" />
                  Position horizontale (X): {{ translations[territory.code]?.x.toFixed(1) }}
                </span>
              </label>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                :value="translations[territory.code]?.x || 0"
                class="range range-primary range-xs"
                @input="updateTranslation(territory.code, 'x', $event)"
              >
              <div class="flex justify-between px-2 text-xs opacity-50 mt-1">
                <span>Gauche</span>
                <span>Centre</span>
                <span>Droite</span>
              </div>
            </div>

            <!-- Y Translation -->
            <div class="mb-4">
              <label class="label">
                <span class="label-text text-sm font-medium">
                  <i class="ri-arrow-up-down-line" />
                  Position verticale (Y): {{ translations[territory.code]?.y.toFixed(1) }}
                </span>
              </label>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.5"
                :value="translations[territory.code]?.y || 0"
                class="range range-secondary range-xs"
                @input="updateTranslation(territory.code, 'y', $event)"
              >
              <div class="flex justify-between px-2 text-xs opacity-50 mt-1">
                <span>Haut</span>
                <span>Centre</span>
                <span>Bas</span>
              </div>
            </div>

            <!-- Scale -->
            <div class="mb-2">
              <label class="label">
                <span class="label-text text-sm font-medium">
                  <i class="ri-expand-diagonal-line" />
                  Échelle: {{ scales[territory.code]?.toFixed(2) }}×
                </span>
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                :value="scales[territory.code] || 1.0"
                class="range range-accent range-xs"
                @input="updateScale(territory.code, $event)"
              >
              <div class="flex justify-between px-2 text-xs opacity-50 mt-1">
                <span>0.5×</span>
                <span>1.0×</span>
                <span>2.0×</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div v-if="props.showTransformControls" class="mt-6 flex gap-2">
      <button
        class="btn btn-sm btn-outline"
        @click="resetToDefaults"
      >
        <i class="ri-restart-line" />
        Réinitialiser
      </button>
    </div>
  </div>
</template>
