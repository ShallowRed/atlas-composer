<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { VueCartographer } from './cartographer/VueCartographer'
import { PROJECTION_OPTIONS } from './services/GeoProjectionService'
import MetropolitanFranceMap from './components/MetropolitanFranceMap.vue'
import DOMTOMGrid from './components/DOMTOMGrid.vue'

// State management
const isLoading = ref(true)
const error = ref<string | null>(null)
const cartographer = ref<VueCartographer | null>(null)

// Control state
const controls = reactive({
  scalePreservation: true,
  selectedProjection: 'albers-france',
  territoryMode: 'metropole-major'
})

// Territory data state
const metropolitanFranceData = ref<GeoJSON.FeatureCollection | null>(null)
const domtomTerritoriesData = ref<any[]>([])

// Tab management
const activeTab = ref('vue-composite')

// Template refs
const vueCompositeContainer = ref<HTMLElement>()
const projectionCompositeContainer = ref<HTMLElement>()

// Computed properties
const projectionGroups = computed(() => {
  const groups: { [key: string]: any[] } = {}
  PROJECTION_OPTIONS.forEach(option => {
    if (!groups[option.category]) {
      groups[option.category] = []
    }
    groups[option.category]!.push(option)
  })
  
  return Object.entries(groups).map(([category, options]) => ({
    category,
    options
  }))
})

const showProjectionSelector = computed(() => {
  return activeTab.value !== 'projection-composite'
})

const showTerritorySelector = computed(() => {
  return activeTab.value === 'vue-composite' || activeTab.value === 'projection-composite'
})

// Methods
const switchTab = async (tabId: string) => {
  activeTab.value = tabId
  await nextTick()
  updateMaps()
}

const loadTerritoryData = async () => {
  if (!cartographer.value) return
  
  try {
    // Load metropolitan France data
    const geoDataService = (cartographer.value as any).geoDataService
    metropolitanFranceData.value = await geoDataService.getMetropoleData()
    domtomTerritoriesData.value = await geoDataService.getDOMTOMData()
  } catch (err) {
    console.error('Error loading territory data:', err)
    throw err
  }
}

const updateMaps = async () => {
  if (!cartographer.value) return
  
  try {
    isLoading.value = true
    error.value = null
    
    // Update cartographer with new settings
    cartographer.value.updateSettings({
      scalePreservation: controls.scalePreservation,
      selectedProjection: controls.selectedProjection,
      territoryMode: controls.territoryMode,
      activeTab: activeTab.value
    })
    
    // Load territory data if we're on the individual territories tab
    if (activeTab.value === 'individual-territories') {
      await loadTerritoryData()
    }
    
    // Render appropriate maps based on active tab
    switch (activeTab.value) {
      case 'vue-composite':
        await cartographer.value.renderVueComposite(vueCompositeContainer.value!)
        break
      case 'projection-composite':
        await cartographer.value.renderProjectionComposite(projectionCompositeContainer.value!)
        break
      case 'individual-territories':
        // Data is now loaded in Vue state, no need for DOM manipulation
        break
    }
    
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors du rendu des cartes'
    console.error('Map update error:', err)
  } finally {
    isLoading.value = false
  }
}

// Lifecycle
onMounted(async () => {
  try {
    cartographer.value = new VueCartographer()
    await cartographer.value.init()
    await updateMaps()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors de l\'initialisation'
    console.error('Initialization error:', err)
  } finally {
    isLoading.value = false
  }
})
</script>
<template>
  <div id="app" class="min-h-screen bg-base-200">
    <!-- Header -->
    <header class="hero bg-base-300">
      <div class="hero-content text-center py-12">
        <div class="max-w-md">
          <h1 class="text-4xl font-bold">Cartographies de la France</h1>
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
            <i class="ri-settings-3-line text-xl"></i>
            Configuration
          </h2>
          
          <div class="flex flex-col gap-6">
            <!-- Theme Selector -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text flex items-center gap-2">
                  <i class="ri-palette-line"></i>
                  Thème
                </span>
              </label>
              <select class="select cursor-pointer">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="cupcake">Cupcake</option>
                <option value="bumblebee">Bumblebee</option>
                <option value="emerald">Emerald</option>
                <option value="corporate">Corporate</option>
                <option value="synthwave">Synthwave</option>
                <option value="retro">Retro</option>
                <option value="cyberpunk">Cyberpunk</option>
                <option value="valentine">Valentine</option>
                <option value="halloween">Halloween</option>
                <option value="garden">Garden</option>
                <option value="forest">Forest</option>
                <option value="aqua">Aqua</option>
                <option value="lofi">Lofi</option>
                <option value="pastel">Pastel</option>
                <option value="fantasy">Fantasy</option>
                <option value="wireframe">Wireframe</option>
                <option value="black">Black</option>
                <option value="luxury">Luxury</option>
                <option value="dracula">Dracula</option>
                <option value="cmyk">CMYK</option>
                <option value="autumn">Autumn</option>
                <option value="business">Business</option>
                <option value="acid">Acid</option>
                <option value="lemonade">Lemonade</option>
                <option value="night">Night</option>
                <option value="coffee">Coffee</option>
                <option value="winter">Winter</option>
                <option value="dim">Dim</option>
                <option value="nord">Nord</option>
                <option value="sunset">Sunset</option>
              </select>
            </div>
            <!-- Projection Select -->
            <div class="form-control">
              <label class="label mb-1">
                Projection cartographique
              </label>
              <select 
                class="select cursor-pointer"
                v-model="controls.selectedProjection"
                @change="updateMaps"
                :disabled="!showProjectionSelector"
              >
                <optgroup 
                  v-for="group in projectionGroups" 
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
            
            <!-- Scale Preservation -->
            <div class="form-control separate-only">
              <label class="label cursor-pointer flex flex-row-reverse justify-end gap-2">
                <span>
                  Préserver les rapports de taille
                </span>
                <input 
                  type="checkbox" 
                  class="toggle toggle-primary" 
                  v-model="controls.scalePreservation"
                  @change="updateMaps"
                />
              </label>
            </div>

            <!-- Territory Selection (Both Composite Views) -->
            <div class="form-control composite-only composite-raw-only" v-show="showTerritorySelector">
              <label class="label mb-1">
                Territoires à inclure
              </label>
              <select 
                class="select cursor-pointer"
                v-model="controls.territoryMode"
                @change="updateMaps"
              >
                <option value="metropole-only">Métropole seule</option>
                <option value="metropole-major">+ Principaux DOM-TOM</option>
                <option value="metropole-uncommon">+ Moins courants</option>
                <option value="all-territories">+ Rarement représentés</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Navigation using DaisyUI -->
      <div class="tabs tabs-lift tabs-xl w-full md:w-3/4">
        <input 
          type="radio" 
          name="map_tabs" 
          class="tab" 
          aria-label="Vue Composite" 
          id="tab-composite" 
          :checked="activeTab === 'vue-composite'" 
          @change="switchTab('vue-composite')" 
        />
        <div class="tab-content shadow-lg bg-base-100 border-base-300 p-8" v-show="activeTab === 'vue-composite'">
          <h2 class="card-title mb-2">
            <i class="ri-map-2-line text-lg"></i>
            Vue d'ensemble avec repositionnement
          </h2>
          <div ref="vueCompositeContainer" class="map-plot"></div>
        </div>

        <input 
          type="radio" 
          name="map_tabs" 
          class="tab" 
          aria-label="Projection Composite" 
          id="tab-composite-raw" 
          :checked="activeTab === 'projection-composite'" 
          @change="switchTab('projection-composite')" 
        />
        <div class="tab-content shadow-lg bg-base-100 border-base-300 p-8" v-show="activeTab === 'projection-composite'">
          <h2 class="card-title mb-2">
            <i class="ri-global-line text-lg"></i>
            Projection composite (coordonnées originales)
          </h2>
          <p class="text-sm opacity-70 mb-4">
            Utilise la projection composite geoAlbersFrance avec les coordonnées originales. Reproduit l'effet de "Vue Composite" mais avec repositionnement géré par la projection.
          </p>
          <div ref="projectionCompositeContainer" class="map-plot"></div>
        </div>

        <input 
          type="radio" 
          name="map_tabs" 
          class="tab" 
          aria-label="Territoires Séparés" 
          id="tab-separate" 
          :checked="activeTab === 'individual-territories'" 
          @change="switchTab('individual-territories')" 
        />
        <div class="tab-content shadow-lg bg-base-100 border-base-300 p-8" v-show="activeTab === 'individual-territories'">
          <!-- Separate Territory Views Content -->
          <div class="flex flex-row gap-12">
            <!-- Metropolitan France -->
            <div class="">
              <h2 class="card-title mb-2">
                <i class="ri-map-pin-line text-lg"></i>
                France Métropolitaine
              </h2>
              <MetropolitanFranceMap
                v-if="metropolitanFranceData"
                :geo-data="metropolitanFranceData"
                :projection-type="controls.selectedProjection"
              />
            </div>
            
            <!-- DOM-TOM -->
            <div class="">
              <h2 class="card-title mb-2">
                <i class="ri-earth-line text-lg"></i>
                Départements et Collectivités d'Outre-Mer
              </h2>
              <DOMTOMGrid
                :territories="domtomTerritoriesData"
                :projection-type="controls.selectedProjection"
                :preserve-scale="controls.scalePreservation"
                :territory-mode="controls.territoryMode"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

    <!-- Loading Indicator -->
    <div v-if="isLoading" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body items-center text-center">
          <div class="loading loading-spinner loading-lg text-primary"></div>
          <h3 class="text-lg font-semibold">Chargement des données...</h3>
          <p class="text-sm text-base-content/70">Préparation des cartes géographiques</p>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="toast toast-top toast-end">
      <div class="alert alert-error">
        <i class="ri-error-warning-line"></i>
        <span>{{ error }}</span>
        <button class="btn btn-sm btn-ghost" @click="error = null">
          <i class="ri-close-line"></i>
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