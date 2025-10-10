<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AtlasConfigSection from '@/components/configuration/AtlasConfigSection.vue'
import DisplayOptionsSection from '@/components/configuration/DisplayOptionsSection.vue'
import ViewConfigSection from '@/components/configuration/ViewConfigSection.vue'
import TerritoryControls from '@/components/TerritoryControls.vue'
import CardContainer from '@/components/ui/CardContainer.vue'
import ViewModeSection from '@/components/ui/ViewModeSection.vue'
import CompositeCustomView from '@/components/views/CompositeCustomView.vue'
import CompositeExistingView from '@/components/views/CompositeExistingView.vue'
import SplitView from '@/components/views/SplitView.vue'
import UnifiedView from '@/components/views/UnifiedView.vue'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionFamily } from '@/core/projections/types'
import { AtlasPatternService } from '@/services/atlas/atlas-pattern-service'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

const { t } = useI18n()
const allowThemeSelection = false

// Stores
const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()

// Dedicated skeleton visibility control
const showSkeleton = ref(false)

// Simple helper to ensure skeleton is visible for minimum duration
const MIN_LOADING_TIME = 200 // ms
async function withMinLoadingTime<T>(fn: () => Promise<T>): Promise<T> {
  showSkeleton.value = true
  const start = Date.now()
  try {
    const result = await fn()
    const elapsed = Date.now() - start
    if (elapsed < MIN_LOADING_TIME) {
      await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed))
    }
    return result
  }
  finally {
    showSkeleton.value = false
  }
}

// Computed
const compositeProjectionOptions = computed(() => {
  // Get the current region's available composite projections
  const atlasConfig = configStore.currentAtlasConfig
  const availableProjections = atlasConfig.compositeProjections || []

  // Get all composite projections from registry and filter by region
  return projectionRegistry.getAll()
    .filter(def => def.family === ProjectionFamily.COMPOSITE && availableProjections.includes(def.id))
    .map(def => ({ value: def.id, label: t(def.name) }))
})

const viewModeOptions = computed(() => {
  const atlasConfig = configStore.currentAtlasConfig
  const supportedModes = atlasConfig.supportedViewModes || []

  // All possible view mode options
  const allOptions = [
    { value: 'composite-custom', label: t('mode.compositeCustom') },
    { value: 'split', label: t('mode.split') },
    { value: 'composite-existing', label: t('mode.compositeExisting') },
    { value: 'unified', label: t('mode.unified') },
  ]

  // Filter to only supported modes for this region
  return allOptions.filter(option => supportedModes.includes(option.value as any))
})

// Methods
// updateMaps() removed - MapRenderer now watches store changes automatically

// Get projection for mainland in individual mode
function getMainLandProjection() {
  if (configStore.projectionMode === 'individual') {
    const mainlandCode = configStore.currentAtlasConfig.splitModeConfig?.mainlandCode
    if (mainlandCode) {
      return configStore.territoryProjections[mainlandCode] || configStore.selectedProjection
    }
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

// Check if there are territories to configure (including mainland)
const hasTerritoriesForProjectionConfig = computed(() => {
  // Has territories
  if (geoDataStore.filteredTerritories.length > 0) {
    return true
  }

  // Or has mainland with single-focus pattern configuration
  const patternService = AtlasPatternService.fromPattern(configStore.currentAtlasConfig.pattern)
  return patternService.isSingleFocus() && geoDataStore.mainlandData !== null
})

// Lifecycle
onMounted(async () => {
  try {
    // Initialize theme
    configStore.initializeTheme()

    // Wrap in minimum loading time to prevent skeleton flash
    await withMinLoadingTime(async () => {
      // Only initialize if not already initialized (important for route navigation)
      if (!geoDataStore.isInitialized) {
        await geoDataStore.initialize()
      }

      // Load territory data for initial render if needed
      // Both split and composite-custom modes need territory data for individual projections
      if (configStore.viewMode === 'split' || configStore.viewMode === 'composite-custom') {
        if (!geoDataStore.overseasTerritoriesData.length) {
          await geoDataStore.loadTerritoryData()
        }
      }
      // Load unified data for unified mode
      else if (configStore.viewMode === 'unified') {
        if (!geoDataStore.rawUnifiedData) {
          await geoDataStore.loadRawUnifiedData(configStore.territoryMode)
        }
      }
    })
  }
  catch (err) {
    geoDataStore.error = err instanceof Error ? err.message : 'Erreur lors de l\'initialisation'
    console.error('Initialization error:', err)
  }
})

// Watch for view mode changes to load territory data when needed
watch(() => configStore.viewMode, async (newMode) => {
  await withMinLoadingTime(async () => {
    // Load territory data for split and composite-custom modes (needed for individual projections)
    if ((newMode === 'split' || newMode === 'composite-custom') && !geoDataStore.overseasTerritoriesData.length) {
      await geoDataStore.loadTerritoryData()
    }
    // Load unified data for unified mode
    else if (newMode === 'unified' && !geoDataStore.rawUnifiedData) {
      await geoDataStore.loadRawUnifiedData(configStore.territoryMode)
    }
  })
})

// Watch for region changes to reinitialize data
watch(() => configStore.selectedAtlas, async () => {
  try {
    await withMinLoadingTime(async () => {
      await geoDataStore.reinitialize()

      // Load territory data for split and composite-custom modes
      if (configStore.viewMode === 'split' || configStore.viewMode === 'composite-custom') {
        await geoDataStore.loadTerritoryData()
      }
      // Load unified data for unified mode
      else if (configStore.viewMode === 'unified') {
        await geoDataStore.loadRawUnifiedData(configStore.territoryMode)
      }
    })
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
    await withMinLoadingTime(async () => {
      await geoDataStore.loadRawUnifiedData(configStore.territoryMode)
    })
  }
})
</script>

<template>
  <div class="flex-1 flex flex-col lg:flex-row gap-6">
    <section
      class="lg:w-1/4 max-h-[calc(100vh-8rem)] flex flex-col gap-6"
    >
      <!-- Atlas Configuration -->
      <AtlasConfigSection :allow-theme-selection="allowThemeSelection" />

      <!-- View Configuration -->
      <ViewConfigSection
        :view-mode-options="viewModeOptions"
        :composite-projection-options="compositeProjectionOptions"
      />

      <!-- Display Options -->
      <DisplayOptionsSection />
    </section>
    <section
      class="lg:w-1/2 max-h-[calc(100vh-8rem)]"
    >
      <!-- Main Content Area (Single Tab) -->
      <CardContainer
        :title="configStore.viewMode === 'split' ? 'Territoires séparés' : configStore.viewMode === 'composite-existing' ? 'Projection composite existante' : configStore.viewMode === 'unified' ? 'Projection unifiée' : 'Projection composite personnalisée'"
        icon="ri-map-line"
        class="h-full"
        has-overflow
      >
        <!-- Loading state for main content -->
        <div v-if="showSkeleton || geoDataStore.isLoading" class="space-y-6">
          <!-- Skeleton for main map area -->
          <div class="skeleton h-96 w-full rounded-sm opacity-50" />

          <!-- Skeleton for grid of territories (split mode) -->
          <div v-if="configStore.viewMode === 'split'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="i in 6" :key="i" class="skeleton h-48 rounded-sm opacity-50" />
          </div>
        </div>

        <!-- Content when loaded -->
        <template v-else>
          <!-- Split Territories Mode -->
          <ViewModeSection
            :view-mode="configStore.viewMode"
            active-mode="split"
          >
            <SplitView
              :get-mainland-projection="getMainLandProjection"
              :get-territory-projection="getTerritoryProjection"
            />
          </ViewModeSection>

          <!-- Composite Existing Mode -->
          <ViewModeSection
            :view-mode="configStore.viewMode"
            active-mode="composite-existing"
          >
            <CompositeExistingView />
          </ViewModeSection>

          <!-- Composite Custom Mode -->
          <ViewModeSection
            :view-mode="configStore.viewMode"
            active-mode="composite-custom"
          >
            <CompositeCustomView />
          </ViewModeSection>

          <!-- Unified Mode -->
          <ViewModeSection
            :view-mode="configStore.viewMode"
            active-mode="unified"
          >
            <UnifiedView />
          </ViewModeSection>
        </template>
      </CardContainer>
    </section>
    <section
      class="lg:w-1/4  max-h-[calc(100vh-8rem)]"
    >
      <!-- Territory Parameters (projections, translations, scales) -->
      <CardContainer
        v-show="configStore.showIndividualProjectionSelectors && hasTerritoriesForProjectionConfig"
        :title="t('settings.territoryConfigTitle')"
        icon="ri-settings-4-line"
        class="h-full"
        has-overflow
      >
        <!-- Loading state -->
        <div
          v-if="showSkeleton || geoDataStore.isLoading"
          class="skeleton h-64 rounded-sm opacity-50"
        />
        <!-- Territory controls -->
        <TerritoryControls
          v-else
          :show-transform-controls="configStore.viewMode === 'composite-custom'"
        />
      </CardContainer>
    </section>
  </div>
</template>
