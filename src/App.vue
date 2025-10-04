<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import DOMTOMGrid from '@/components/DOMTOMGrid.vue'
import MapRenderer from '@/components/MapRenderer.vue'
import ProjectionExporter from '@/components/ProjectionExporter.vue'
import ProjectionPreview from '@/components/ProjectionPreview.vue'
import TerritoryTranslationControls from '@/components/TerritoryTranslationControls.vue'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

// Refs
const projectionExporterRef = ref<InstanceType<typeof ProjectionExporter>>()

// Stores
const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()

// Methods
async function switchTab(tabId: 'vue-composite' | 'projection-composite' | 'individual-territories') {
  configStore.setActiveTab(tabId)

  await nextTick() // Wait for DOM to update

  // Load territory data if we're switching to individual territories tab
  if (tabId === 'individual-territories' && !geoDataStore.metropolitanFranceData) {
    await geoDataStore.loadTerritoryData()
  }
}

async function updateMaps() {
  geoDataStore.updateCartographerSettings()
}

// Lifecycle
onMounted(async () => {
  try {
    // Initialize theme
    configStore.initializeTheme()

    // Initialize geo data store
    await geoDataStore.initialize()

    // Load territory data for initial render if needed
    if (configStore.activeTab === 'individual-territories') {
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
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text flex items-center gap-2">
                  <i class="ri-palette-line" />
                  Thème
                </span>
              </label>
              <select
                id="theme-select"
                v-model="configStore.theme"
                class="select cursor-pointer"
                @change="configStore.setTheme(configStore.theme)"
              >
                <option value="light">
                  Light
                </option>
                <option value="dark">
                  Dark
                </option>
                <option value="cupcake">
                  Cupcake
                </option>
                <option value="bumblebee">
                  Bumblebee
                </option>
                <option value="emerald">
                  Emerald
                </option>
                <option value="corporate">
                  Corporate
                </option>
                <option value="synthwave">
                  Synthwave
                </option>
                <option value="retro">
                  Retro
                </option>
                <option value="cyberpunk">
                  Cyberpunk
                </option>
                <option value="valentine">
                  Valentine
                </option>
                <option value="halloween">
                  Halloween
                </option>
                <option value="garden">
                  Garden
                </option>
                <option value="forest">
                  Forest
                </option>
                <option value="aqua">
                  Aqua
                </option>
                <option value="lofi">
                  Lofi
                </option>
                <option value="pastel">
                  Pastel
                </option>
                <option value="fantasy">
                  Fantasy
                </option>
                <option value="wireframe">
                  Wireframe
                </option>
                <option value="black">
                  Black
                </option>
                <option value="luxury">
                  Luxury
                </option>
                <option value="dracula">
                  Dracula
                </option>
                <option value="cmyk">
                  CMYK
                </option>
                <option value="autumn">
                  Autumn
                </option>
                <option value="business">
                  Business
                </option>
                <option value="acid">
                  Acid
                </option>
                <option value="lemonade">
                  Lemonade
                </option>
                <option value="night">
                  Night
                </option>
                <option value="coffee">
                  Coffee
                </option>
                <option value="winter">
                  Winter
                </option>
                <option value="dim">
                  Dim
                </option>
                <option value="nord">
                  Nord
                </option>
                <option value="sunset">
                  Sunset
                </option>
              </select>
            </div>
            <!-- Projection Select -->
            <div class="form-control">
              <label class="label mb-1">
                Projection cartographique
              </label>
              <select
                v-model="configStore.selectedProjection"
                class="select cursor-pointer"
                :disabled="!configStore.showProjectionSelector"
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

            <!-- Scale Preservation (Individual Territories Only) -->
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

            <!-- Territory Selection (All Tabs) -->
            <div v-show="configStore.showTerritorySelector" class="form-control composite-only composite-raw-only">
              <label class="label mb-1">
                Territoires à inclure
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

      <!-- Tab Navigation using DaisyUI -->
      <div class="tabs tabs-lift tabs-xl w-full md:w-3/4">
        <input
          id="tab-composite"
          type="radio"
          name="map_tabs"
          class="tab"
          aria-label="Vue unifiée personnalisable"
          :checked="configStore.activeTab === 'vue-composite'"
          @change="switchTab('vue-composite')"
        >
        <div v-if="configStore.activeTab === 'vue-composite'" class="tab-content shadow-lg bg-base-100 border-base-300 p-8">
          <h2 class="card-title mb-2">
            <i class="ri-map-2-line text-lg" />
            Vue unifiée avec repositionnement personnalisable
          </h2>
          <p class="text-sm opacity-70 mb-4">
            Carte unifiée de la France avec contrôles de positionnement et d'échelle pour chaque territoire d'outre-mer.
          </p>
          <div class="flex gap-6">
            <div class="flex-1 sticky top-4 self-start">
              <MapRenderer mode="vue-composite" />
            </div>
            <div class="w-80 space-y-4">
              <TerritoryTranslationControls />
              <div class="divider" />
              <ProjectionExporter ref="projectionExporterRef" />
              <div v-if="projectionExporterRef?.customProjection" class="mt-4">
                <ProjectionPreview
                  :projection="projectionExporterRef.customProjection"
                  title="Aperçu de la projection générée"
                />
              </div>
            </div>
          </div>
        </div>

        <input
          id="tab-composite-raw"
          type="radio"
          name="map_tabs"
          class="tab"
          aria-label="Projection composite automatique"
          :checked="configStore.activeTab === 'projection-composite'"
          @change="switchTab('projection-composite')"
        >
        <div v-if="configStore.activeTab === 'projection-composite'" class="tab-content shadow-lg bg-base-100 border-base-300 p-8">
          <h2 class="card-title mb-2">
            <i class="ri-global-line text-lg" />
            Projection composite avec repositionnement automatique
          </h2>
          <p class="text-sm opacity-70 mb-4">
            Utilise les projections composites d3 (Albers France ou Conic Conformal France) qui incluent un repositionnement automatique des territoires d'outre-mer.
          </p>
          <MapRenderer mode="projection-composite" />
        </div>

        <input
          id="tab-separate"
          type="radio"
          name="map_tabs"
          class="tab"
          aria-label="Territoires individuels"
          :checked="configStore.activeTab === 'individual-territories'"
          @change="switchTab('individual-territories')"
        >
        <div v-if="configStore.activeTab === 'individual-territories'" class="tab-content shadow-lg bg-base-100 border-base-300 p-8">
          <p class="text-sm opacity-70 mb-4">
            Vue séparée de chaque territoire avec sa propre projection optimisée.
          </p>
          <!-- Separate Territory Views Content -->
          <div class="flex flex-row gap-12">
            <!-- Metropolitan France -->
            <div class="">
              <h2 class="card-title mb-2">
                <i class="ri-map-pin-line text-lg" />
                France Métropolitaine
              </h2>
              <MapRenderer
                :geo-data="geoDataStore.metropolitanFranceData"
                is-metropolitan
                :width="500"
                :height="400"
              />
            </div>

            <!-- DOM-TOM -->
            <div class="">
              <h2 class="card-title mb-2">
                <i class="ri-earth-line text-lg" />
                Départements et Collectivités d'Outre-Mer
              </h2>
              <DOMTOMGrid />
            </div>
          </div>
        </div>
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
