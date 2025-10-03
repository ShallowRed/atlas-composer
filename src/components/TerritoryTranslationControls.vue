<template>
  <div class="territory-translation-controls p-4 bg-base-200 rounded-lg overflow-y-auto max-h-screen">
    <h3 class="text-lg font-semibold mb-4">
      <i class="ri-drag-move-2-line"></i>
      Ajuster les territoires d'outre-mer
    </h3>
    
    <!-- Accordion for all territories -->
    <div class="join join-vertical w-full">
      <div 
        v-for="(territory, index) in territories" 
        :key="territory.code"
        class="collapse collapse-arrow join-item border bg-base-100 border-base-300"
      >
        <input 
          type="radio" 
          name="territory-accordion" 
          :checked="index === 0"
        />
        <div class="collapse-title font-semibold">
          {{ territory.name }} <span class="text-sm opacity-60">({{ territory.code }})</span>
        </div>
        <div class="collapse-content">
          <!-- X Translation -->
          <div class="mb-4">
            <label class="label">
              <span class="label-text text-sm font-medium">
                <i class="ri-arrow-left-right-line"></i>
                Position horizontale (X): {{ translations[territory.code]?.x.toFixed(1) }}
              </span>
            </label>
            <input 
              type="range" 
              min="-15" 
              max="15" 
              step="0.5"
              :value="translations[territory.code]?.x || 0"
              @input="updateTranslation(territory.code, 'x', $event)"
              class="range range-primary range-xs" 
            />
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
                <i class="ri-arrow-up-down-line"></i>
                Position verticale (Y): {{ translations[territory.code]?.y.toFixed(1) }}
              </span>
            </label>
            <input 
              type="range" 
              min="-10" 
              max="10" 
              step="0.5"
              :value="translations[territory.code]?.y || 0"
              @input="updateTranslation(territory.code, 'y', $event)"
              class="range range-secondary range-xs" 
            />
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
                <i class="ri-expand-diagonal-line"></i>
                Échelle: {{ scales[territory.code]?.toFixed(2) }}×
              </span>
            </label>
            <input 
              type="range" 
              min="0.5" 
              max="2.0" 
              step="0.1"
              :value="scales[territory.code] || 1.0"
              @input="updateScale(territory.code, $event)"
              class="range range-accent range-xs" 
            />
            <div class="flex justify-between px-2 text-xs opacity-50 mt-1">
              <span>0.5×</span>
              <span>1.0×</span>
              <span>2.0×</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="mt-6 flex gap-2">
      <button 
        @click="resetToDefaults" 
        class="btn btn-sm btn-outline"
      >
        <i class="ri-restart-line"></i>
        Réinitialiser
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '../stores/config'

const configStore = useConfigStore()

const territories = [
  { code: 'FR-GF', name: 'Guyane française' },
  { code: 'FR-RE', name: 'La Réunion' },
  { code: 'FR-GP', name: 'Guadeloupe' },
  { code: 'FR-MQ', name: 'Martinique' },
  { code: 'FR-YT', name: 'Mayotte' },
]

const translations = computed(() => configStore.territoryTranslations)
const scales = computed(() => configStore.territoryScales)

const updateTranslation = (territoryCode: string, axis: 'x' | 'y', event: Event) => {
  const value = parseFloat((event.target as HTMLInputElement).value)
  configStore.setTerritoryTranslation(territoryCode, axis, value)
}

const updateScale = (territoryCode: string, event: Event) => {
  const value = parseFloat((event.target as HTMLInputElement).value)
  configStore.setTerritoryScale(territoryCode, value)
}

const resetToDefaults = () => {
  // Reset to default translation values
  configStore.setTerritoryTranslation('FR-GF', 'x', -8)
  configStore.setTerritoryTranslation('FR-GF', 'y', -2)
  configStore.setTerritoryTranslation('FR-RE', 'x', -10)
  configStore.setTerritoryTranslation('FR-RE', 'y', 3)
  configStore.setTerritoryTranslation('FR-GP', 'x', -8)
  configStore.setTerritoryTranslation('FR-GP', 'y', 1)
  configStore.setTerritoryTranslation('FR-MQ', 'x', -8.5)
  configStore.setTerritoryTranslation('FR-MQ', 'y', 2.5)
  configStore.setTerritoryTranslation('FR-YT', 'x', -2)
  configStore.setTerritoryTranslation('FR-YT', 'y', -5)
  
  // Reset to default scale values
  configStore.setTerritoryScale('FR-GF', 1.0)
  configStore.setTerritoryScale('FR-RE', 1.0)
  configStore.setTerritoryScale('FR-GP', 1.0)
  configStore.setTerritoryScale('FR-MQ', 1.0)
  configStore.setTerritoryScale('FR-YT', 1.0)
}
</script>