<script setup lang="ts">
// import type ProjectionExporter from '@/components/ProjectionExporter.vue'
// import { onMounted, ref } from 'vue'
import { computed, onMounted, watch } from 'vue'
import MapRenderer from '@/components/MapRenderer.vue'
import TerritoryControls from '@/components/TerritoryControls.vue'
import CardContainer from '@/components/ui/CardContainer.vue'
import FormControl from '@/components/ui/FormControl.vue'
import HeroBanner from '@/components/ui/HeroBanner.vue'
import LoadingModal from '@/components/ui/LoadingModal.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import ThemeSelector from '@/components/ui/ThemeSelector.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import ViewModeSection from '@/components/ui/ViewModeSection.vue'
import { getAvailableRegions } from '@/constants/regions'
import { PROJECTION_OPTIONS } from '@/services/GeoProjectionService'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

const allowThemeSelection = false
// Refs
// const projectionExporterRef = ref<InstanceType<typeof ProjectionExporter>>()

// Stores
const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()

// Computed
const compositeProjectionOptions = computed(() => {
  // Get the current region's available composite projections
  const regionConfig = configStore.currentRegionConfig
  const availableProjections = regionConfig.compositeProjections || []

  // Filter PROJECTION_OPTIONS to only show projections available for this region
  return PROJECTION_OPTIONS
    .filter(option =>
      option.category.startsWith('Projections Composites') // Matches all composite projection categories
      && availableProjections.includes(option.value),
    )
    .map(option => ({ value: option.value, label: option.label }))
})

const viewModeOptions = computed(() => {
  const regionConfig = configStore.currentRegionConfig
  const supportedModes = regionConfig.supportedViewModes || []

  // All possible view mode options
  const allOptions = [
    { value: 'composite-custom', label: 'Projection composite personnalisée' },
    { value: 'split', label: 'Territoires séparés' },
    { value: 'composite-existing', label: 'Projection composite existante' },
    { value: 'unified', label: 'Projection unifiée' },
  ]

  // Filter to only supported modes for this region
  return allOptions.filter(option => supportedModes.includes(option.value as any))
})

// Methods
// updateMaps() removed - MapRenderer now watches store changes automatically

// Get projection for metropolitan France in individual mode
function getMainLandProjection() {
  if (configStore.projectionMode === 'individual') {
    return configStore.territoryProjections['FR-MET'] || configStore.selectedProjection
  }
  return configStore.selectedProjection
}

// Get projection for a specific territory
function getTerritoryProjection(territoryCode: string) {
  if (configStore.projectionMode === 'individual') {
    // Use territory-specific projection if defined, otherwise use default
    return configStore.territoryProjections[territoryCode] || configStore.selectedProjection
  }
  // Use uniform projection
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
    // Both split and composite-custom modes need territory data for individual projections
    if (configStore.viewMode === 'split' || configStore.viewMode === 'composite-custom') {
      await geoDataStore.loadTerritoryData()
    }
    // Load unified data for unified mode
    else if (configStore.viewMode === 'unified') {
      await geoDataStore.loadRawUnifiedData(configStore.territoryMode)
    }
  }
  catch (err) {
    geoDataStore.error = err instanceof Error ? err.message : 'Erreur lors de l\'initialisation'
    console.error('Initialization error:', err)
  }
})

// Watch for view mode changes to load territory data when needed
watch(() => configStore.viewMode, async (newMode) => {
  // Load territory data for split and composite-custom modes (needed for individual projections)
  if ((newMode === 'split' || newMode === 'composite-custom') && !geoDataStore.overseasTerritoriesData.length) {
    await geoDataStore.loadTerritoryData()
  }
  // Load unified data for unified mode
  else if (newMode === 'unified' && !geoDataStore.rawUnifiedData) {
    await geoDataStore.loadRawUnifiedData(configStore.territoryMode)
  }
})

// Watch for region changes to reinitialize data
watch(() => configStore.selectedRegion, async () => {
  try {
    await geoDataStore.reinitialize()

    // Load territory data for split and composite-custom modes
    if (configStore.viewMode === 'split' || configStore.viewMode === 'composite-custom') {
      await geoDataStore.loadTerritoryData()
    }
    // Load unified data for unified mode
    else if (configStore.viewMode === 'unified') {
      await geoDataStore.loadRawUnifiedData(configStore.territoryMode)
    }
  }
  catch (err) {
    geoDataStore.error = err instanceof Error ? err.message : 'Erreur lors du changement de région'
    console.error('Region change error:', err)
  }
})

// Watch for territory mode changes to reload data in unified mode
watch(() => configStore.territoryMode, async () => {
  // In unified mode, reload data when territory mode changes
  if (configStore.viewMode === 'unified') {
    await geoDataStore.loadRawUnifiedData(configStore.territoryMode)
  }
})
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <HeroBanner />
    <main class="container mx-auto py-8 flex flex-col md:flex-row gap-6">
      <!-- Controls Card -->
      <CardContainer
        title="Configuration"
        icon="ri-settings-3-line"
        width="md:w-1/4"
      >
        <div class="flex flex-col gap-6">
          <!-- Theme Selector -->
          <ThemeSelector v-if="allowThemeSelection" />

          <!-- Region Selector -->
          <FormControl
            v-model="configStore.selectedRegion"
            label="Région"
            icon="ri-global-line"
            type="select"
            :options="getAvailableRegions()"
          />

          <!-- Main View Mode Selector -->
          <FormControl
            v-model="configStore.viewMode"
            label="Mode d'affichage"
            icon="ri-layout-grid-line"
            type="select"
            :disabled="configStore.isViewModeLocked"
            :options="viewModeOptions"
          />

          <!-- Composite Projection Selector (for composite-existing mode) -->
          <FormControl
            v-show="configStore.showCompositeProjectionSelector && compositeProjectionOptions.length > 0"
            v-model="configStore.compositeProjection"
            label="Projection composite"
            icon="ri-global-line"
            type="select"
            :options="compositeProjectionOptions"
          />

          <!-- Projection Mode Toggle (for split and composite-custom modes) -->
          <FormControl
            v-show="configStore.showProjectionModeToggle"
            v-model="configStore.projectionMode"
            label="Mode de projection"
            icon="ri-git-branch-line"
            type="select"
            :options="[
              { value: 'uniform', label: 'Uniforme' },
              { value: 'individual', label: 'Individuelle' },
            ]"
          />

          <!-- Uniform Projection Selector (for uniform projection mode) -->
          <FormControl
            v-show="configStore.showProjectionSelector"
            v-model="configStore.selectedProjection"
            label="Projection cartographique"
            icon="ri-global-line"
            type="select"
            :option-groups="configStore.projectionGroups"
          />

          <!-- Scale Preservation (for split mode only) -->
          <FormControl
            v-show="configStore.showScalePreservation"
            v-model="configStore.scalePreservation"
            label="Préserver les rapports de taille"
            type="toggle"
          />

          <!-- Territory Selection (for composite modes) -->
          <FormControl
            v-show="configStore.showTerritorySelector && configStore.currentRegionConfig?.hasTerritorySelector"
            v-model="configStore.territoryMode"
            label="Territoires à inclure"
            icon="ri-map-pin-range-line"
            type="select"
            :options="configStore.currentRegionConfig?.territoryModeOptions || []"
          />
        </div>
      </CardContainer>

      <!-- Main Content Area (Single Tab) -->
      <!-- <div class="md:w-3/4 card card-border w-full shadow-lg bg-base-100 border-base-300 p-8"> -->
      <CardContainer
        width="md:w-3/4"
        :title="configStore.viewMode === 'split' ? 'Territoires séparés' : configStore.viewMode === 'composite-existing' ? 'Projection composite existante' : configStore.viewMode === 'unified' ? 'Projection unifiée' : 'Projection composite personnalisée'"
        icon="ri-map-2-line"
      >
        <!-- Loading state for main content -->
        <div v-if="geoDataStore.isLoading" class="space-y-6">
          <!-- Skeleton for main map area -->
          <div class="skeleton h-96 w-full" />

          <!-- Skeleton for grid of territories (split mode) -->
          <div v-if="configStore.viewMode === 'split'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="i in 6" :key="i" class="skeleton h-48" />
          </div>
        </div>

        <!-- Content when loaded -->
        <template v-else>
          <!-- Split Territories Mode -->
          <ViewModeSection
            :view-mode="configStore.viewMode"
            active-mode="split"
          >
            <!-- France: Mainland + Overseas split layout -->
            <div v-if="configStore.currentRegionConfig.geoDataConfig.overseasTerritories.length > 0" class="flex flex-row gap-12">
              <!-- Metropolitan France -->
              <div>
                <SectionHeader
                  :title="configStore.currentRegionConfig.splitModeConfig?.mainlandTitle || 'Mainland'"
                  icon="ri-map-pin-line"
                  :level="3"
                />
                <MapRenderer
                  :geo-data="geoDataStore.mainlandData"
                  is-mainland
                  :projection="getMainLandProjection()"
                  :width="500"
                  :height="400"
                />
              </div>

              <div>
                <SectionHeader
                  :title="configStore.currentRegionConfig.splitModeConfig?.territoriesTitle || 'Territories'"
                  icon="ri-earth-line"
                  :level="3"
                />

                <div class="flex flex-col gap-4">
                  <!-- Region Groups -->
                  <div
                    v-for="[regionName, territories] in geoDataStore.territoryGroups"
                    :key="regionName"
                    class="bg-base-200 border border-base-300 p-4 rounded-lg"
                  >
                    <h3 class="text-lg font-semibold mb-4 text-gray-700">
                      {{ regionName }}
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div
                        v-for="territory in territories"
                        :key="territory.code"
                        class="bg-base-100 border border-base-300 p-4 rounded-md"
                      >
                        <MapRenderer
                          :geo-data="territory.data"
                          :title="territory.name"
                          :area="territory.area"
                          :region="territory.region"
                          :preserve-scale="configStore.scalePreservation"
                          :projection="getTerritoryProjection(territory.code)"
                          :width="200"
                          :height="160"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Empty State -->
                  <div v-if="geoDataStore.filteredTerritories.length === 0" class="text-center p-4 text-gray-500">
                    <p>Aucun territoire d'outre-mer disponible.</p>
                    <p class="text-sm mt-2">
                      Mode: {{ configStore.territoryMode }}
                    </p>
                    <p class="text-sm">
                      Vérifiez les données ou changez le mode de sélection des territoires.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- EU / Other regions: All territories in a single grid -->
            <div v-else>
              <SectionHeader
                :title="configStore.currentRegionConfig.splitModeConfig?.territoriesTitle || 'Territories'"
                icon="ri-earth-line"
                :level="3"
              />

              <!-- Territories Grid -->
              <div class="flex flex-col gap-4">
                <!-- Region Groups -->
                <div
                  v-for="[regionName, territories] in geoDataStore.territoryGroups"
                  :key="regionName"
                  class="bg-base-200 border border-base-300 p-4 rounded-lg"
                >
                  <h3 class="text-lg font-semibold mb-4 text-gray-700">
                    {{ regionName }}
                  </h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div
                      v-for="territory in territories"
                      :key="territory.code"
                      class="bg-base-100 border border-base-300 p-4 rounded-md"
                    >
                      <MapRenderer
                        :geo-data="territory.data"
                        :title="territory.name"
                        :area="territory.area"
                        :region="territory.region"
                        :preserve-scale="configStore.scalePreservation"
                        :projection="getTerritoryProjection(territory.code)"
                        :width="200"
                        :height="160"
                      />
                    </div>
                  </div>
                </div>

                <!-- Empty State -->
                <div v-if="geoDataStore.filteredTerritories.length === 0" class="text-center p-4 text-gray-500">
                  <p>Aucun territoire disponible.</p>
                  <p class="text-sm mt-2">
                    Vérifiez les données ou changez de région.
                  </p>
                </div>
              </div>
            </div>
          </ViewModeSection>

          <!-- Composite Existing Mode -->
          <ViewModeSection
            :view-mode="configStore.viewMode"
            active-mode="composite-existing"
          >
            <MapRenderer mode="composite" />
          </ViewModeSection>

          <!-- Composite Custom Mode -->
          <ViewModeSection
            :view-mode="configStore.viewMode"
            active-mode="composite-custom"
          >
            <MapRenderer mode="composite" />
          <!-- <div class="w-80 space-y-4">
            <ProjectionExporter ref="projectionExporterRef" />
          </div> -->
          </ViewModeSection>

          <!-- Unified Mode -->
          <ViewModeSection
            :view-mode="configStore.viewMode"
            active-mode="unified"
          >
            <MapRenderer
              :geo-data="geoDataStore.rawUnifiedData"
              :projection="configStore.selectedProjection"
              :width="800"
              :height="600"
            />
          </ViewModeSection>
        </template>
      </CardContainer>

      <!-- Territory Parameters (projections, translations, scales) -->
      <CardContainer
        v-show="configStore.showIndividualProjectionSelectors && geoDataStore.filteredTerritories.length > 0"
        width="md:w-1/4"
        title="Par territoire"
        icon="ri-settings-4-line"
      >
        <!-- Loading state -->
        <div
          v-if="geoDataStore.isLoading"
          class="skeleton h-64"
        />
        <!-- Territory controls -->
        <TerritoryControls
          v-else
          :show-transform-controls="configStore.viewMode === 'composite-custom'"
        />
      </CardContainer>
    </main>
    <LoadingModal :is-loading="geoDataStore.isLoading" />
    <ToastNotification
      :message="geoDataStore.error"
      type="error"
      @close="geoDataStore.clearError()"
    />
  </div>
</template>
