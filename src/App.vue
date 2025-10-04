<script setup lang="ts">
// import type ProjectionExporter from '@/components/ProjectionExporter.vue'
// import { onMounted, ref } from 'vue'
import { onMounted } from 'vue'
import DOMTOMGrid from '@/components/DOMTOMGrid.vue'
import MapRenderer from '@/components/MapRenderer.vue'
import TerritoryTranslationControls from '@/components/TerritoryTranslationControls.vue'
import ThemeSelector from '@/components/ThemeSelector.vue'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

// Refs
// const projectionExporterRef = ref<InstanceType<typeof ProjectionExporter>>()

// Stores
const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()

// Methods
async function updateMaps() {
  geoDataStore.updateCartographerSettings()
}

// Get projection for metropolitan France in individual mode
function getMetropolitanProjection() {
  if (configStore.projectionMode === 'individual') {
    return configStore.territoryProjections['FR-MET'] || configStore.selectedProjection
  }
  return configStore.selectedProjection
}

// Lifecycle
onMounted(async () => {
  try {
    // Initialize theme
    configStore.initializeTheme()

    // Initialize geo data store
    await geoDataStore.initialize()

    // Load territory data for initial render if needed
    if (configStore.viewMode === 'split') {
      await geoDataStore.loadTerritoryData()
    }
  }
  catch (err) {
    geoDataStore.error = err instanceof Error ? err.message : 'Erreur lors de l\'initialisation'
    console.error('Initialization error:', err)
  }
})
</script>

<template>
  <div id="app" class="min-h-screen bg-base-200">
    <!-- Header -->
    <header class="hero bg-base-300">
      <div class="hero-content text-center py-12">
        <div class="max-w-md">
          <h1 class="text-4xl font-bold">
            Cartographies de la France
          </h1>
          <p class="py-4 text-lg opacity-90">
            Représentation de la métropole et des outre-mer avec préservation des rapports de taille
          </p>
        </div>
      </div>
    </header>

    <main class="container mx-auto py-8 flex flex-col md:flex-row gap-6">
      <!-- Controls Card -->
      <div class="card card-border border-base-300 bg-base-100 shadow-lg md:w-1/4 h-min">
        <div class="card-body">
          <h2 class="card-title text-2xl mb-4">
            <i class="ri-settings-3-line text-xl" />
            Configuration
          </h2>

          <div class="flex flex-col gap-6">
            <!-- Theme Selector -->
            <ThemeSelector />

            <!-- Main View Mode Selector -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text flex items-center gap-2">
                  <i class="ri-layout-grid-line" />
                  Mode d'affichage
                </span>
              </label>
              <select
                v-model="configStore.viewMode"
                class="select cursor-pointer"
                @change="updateMaps"
              >
                <option value="composite-custom">
                  Projection composite personnalisée
                </option>
                <option value="split">
                  Territoires séparés
                </option>
                <option value="composite-existing">
                  Projection composite existante
                </option>
              </select>
            </div>

            <!-- Composite Projection Selector (for composite-existing mode) -->
            <div v-show="configStore.showCompositeProjectionSelector" class="form-control">
              <label class="label mb-1">
                <span class="label-text flex items-center gap-2">
                  <i class="ri-global-line" />
                  Projection composite
                </span>
              </label>
              <select
                v-model="configStore.compositeProjection"
                class="select cursor-pointer"
                @change="updateMaps"
              >
                <option value="albers-france">
                  Albers France
                </option>
                <option value="conic-conformal-france">
                  Conic Conformal France
                </option>
              </select>
            </div>

            <!-- Projection Mode Toggle (for split and composite-custom modes) -->
            <div v-show="configStore.showProjectionModeToggle" class="form-control">
              <label class="label mb-1">
                <span class="label-text flex items-center gap-2">
                  <i class="ri-git-branch-line" />
                  Mode de projection
                </span>
              </label>
              <select
                v-model="configStore.projectionMode"
                class="select cursor-pointer"
                @change="updateMaps"
              >
                <option value="uniform">
                  Uniforme
                </option>
                <option value="individual">
                  Individuelle
                </option>
              </select>
            </div>

            <!-- Uniform Projection Selector (for uniform projection mode) -->
            <div v-show="configStore.showProjectionSelector" class="form-control">
              <label class="label mb-1">
                <span class="label-text flex items-center gap-2">
                  <i class="ri-global-line" />
                  Projection cartographique
                </span>
              </label>
              <select
                v-model="configStore.selectedProjection"
                class="select cursor-pointer"
                @change="updateMaps"
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

            <!-- Scale Preservation (for split mode only) -->
            <div v-show="configStore.showScalePreservation" class="form-control">
              <label class="label cursor-pointer flex flex-row-reverse justify-end gap-2">
                <span>
                  Préserver les rapports de taille
                </span>
                <input
                  v-model="configStore.scalePreservation"
                  type="checkbox"
                  class="toggle toggle-primary"
                  @change="updateMaps"
                >
              </label>
            </div>

            <!-- Territory Selection (for composite modes) -->
            <div v-show="configStore.showTerritorySelector" class="form-control">
              <label class="label mb-1">
                <span class="label-text flex items-center gap-2">
                  <i class="ri-map-pin-range-line" />
                  Territoires à inclure
                </span>
              </label>
              <select
                v-model="configStore.territoryMode"
                class="select cursor-pointer"
                @change="updateMaps"
              >
                <option value="metropole-only">
                  France métropolitaine uniquement
                </option>
                <option value="metropole-major">
                  + 5 territoires ultramarins
                </option>
                <option value="metropole-uncommon">
                  + 8 territoires ultramarins
                </option>
                <option value="all-territories">
                  Tous les territoires (11 ultramarins)
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Area (Single Tab) -->
      <div class="tabs tabs-lift tabs-xl w-full md:w-3/4">
        <input
          id="tab-main"
          type="radio"
          name="map_tabs"
          class="tab"
          aria-label="Cartographie de la France"
          checked
        >
        <div class="tab-content shadow-lg bg-base-100 border-base-300 p-8">
          <!-- Split Territories Mode -->
          <div v-show="configStore.viewMode === 'split'">
            <h2 class="card-title mb-2">
              <i class="ri-layout-grid-line text-lg" />
              Territoires séparés
            </h2>
            <p class="text-sm opacity-70 mb-4">
              Vue séparée de chaque territoire avec sa propre projection optimisée.
            </p>
            <div class="flex flex-row gap-12">
              <!-- Metropolitan France -->
              <div>
                <h3 class="text-lg font-semibold mb-2">
                  <i class="ri-map-pin-line text-lg" />
                  France Métropolitaine
                </h3>
                <MapRenderer
                  :geo-data="geoDataStore.metropolitanFranceData"
                  is-metropolitan
                  :projection="getMetropolitanProjection()"
                  :width="500"
                  :height="400"
                />
              </div>

              <!-- DOM-TOM -->
              <div>
                <h3 class="text-lg font-semibold mb-2">
                  <i class="ri-earth-line text-lg" />
                  Départements et Collectivités d'Outre-Mer
                </h3>
                <DOMTOMGrid />
              </div>
            </div>
          </div>

          <!-- Composite Existing Mode -->
          <div v-show="configStore.viewMode === 'composite-existing'">
            <h2 class="card-title mb-2">
              <i class="ri-map-2-line text-lg" />
              Projection composite existante
            </h2>
            <p class="text-sm opacity-70 mb-4">
              Carte unifiée utilisant des projections composites prédéfinies (d3-composite-projections).
            </p>
            <MapRenderer mode="composite" />
          </div>

          <!-- Composite Custom Mode -->
          <div v-show="configStore.viewMode === 'composite-custom'">
            <h2 class="card-title mb-2">
              <i class="ri-map-2-line text-lg" />
              Projection composite personnalisée
            </h2>
            <p class="text-sm opacity-70 mb-4">
              Carte unifiée avec projections individuelles et positionnement manuel des territoires.
            </p>
            <div class="flex gap-6">
              <div class="flex-1">
                <MapRenderer mode="composite" />
              </div>
              <!-- <div class="w-80 space-y-4">
                <ProjectionExporter ref="projectionExporterRef" />
              </div> -->
            </div>
          </div>
        </div>
      </div>

      <!-- Territory Parameters (projections, translations, scales) -->
      <div v-show="configStore.showIndividualProjectionSelectors" class="mt-6 card card-border border-base-300 bg-base-100 shadow-lg md:w-1/4 h-min">
        <TerritoryTranslationControls
          :show-transform-controls="configStore.viewMode === 'composite-custom'"
        />
      </div>
    </main>
  </div>

  <!-- Loading Indicator -->
  <div v-if="geoDataStore.isLoading" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body items-center text-center">
        <div class="loading loading-spinner loading-lg text-primary" />
        <h3 class="text-lg font-semibold">
          Chargement des données...
        </h3>
        <p class="text-sm text-base-content/70">
          Préparation des cartes géographiques
        </p>
      </div>
    </div>
  </div>

  <!-- Error Display -->
  <div v-if="geoDataStore.error" class="toast toast-top toast-end">
    <div class="alert alert-error">
      <i class="ri-error-warning-line" />
      <span>{{ geoDataStore.error }}</span>
      <button class="btn btn-sm btn-ghost" @click="geoDataStore.clearError()">
        <i class="ri-close-line" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.map-plot {
  min-height: 600px;
  width: 100%;
}

.toast {
  z-index: 1000;
}
</style>
