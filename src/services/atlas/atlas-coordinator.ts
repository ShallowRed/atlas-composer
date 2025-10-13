import type { ViewMode } from '@/types'

import { DEFAULT_ATLAS, getAtlasConfig, getAtlasSpecificConfig } from '@/core/atlases/registry'
import { AtlasService } from '@/services/atlas/atlas-service'
import { TerritoryDefaultsService } from '@/services/atlas/territory-defaults-service'
import { PresetLoader } from '@/services/presets/preset-loader'

/**
 * Configuration updates to apply when atlas changes
 */
export interface AtlasChangeResult {
  viewMode: ViewMode
  territoryMode: string
  projections: Record<string, string>
  translations: Record<string, { x: number, y: number }>
  scales: Record<string, number>
  compositeProjection?: string
  selectedProjection: string
  mapDisplay: {
    showGraticule: boolean
    showSphere: boolean
    showCompositionBorders: boolean
    showMapLimits: boolean
  }
}

/**
 * Coordinator service for managing atlas changes and initialization
 * Centralizes complex orchestration logic that was previously in store watchers
 */
export class AtlasCoordinator {
  /**
   * Handle atlas change and calculate all necessary configuration updates
   *
   * @param newAtlasId - The new atlas identifier
   * @param currentViewMode - Current view mode (to check if supported)
   * @returns Complete configuration updates to apply
   */
  static async handleAtlasChange(
    newAtlasId: string,
    currentViewMode: ViewMode,
  ): Promise<AtlasChangeResult> {
    const config = getAtlasConfig(newAtlasId)
    const specificConfig = getAtlasSpecificConfig(newAtlasId)
    const atlasService = new AtlasService(newAtlasId)

    // Determine new view mode (use default if current is not supported)
    const viewMode = config.supportedViewModes.includes(currentViewMode)
      ? currentViewMode
      : config.defaultViewMode

    // Determine territory mode
    const territoryMode = this.getTerritoryMode(config)

    // Initialize territory defaults
    const territories = atlasService.getAllTerritories()
    let finalDefaults = TerritoryDefaultsService.initializeAll(territories, 'mercator')

    // Load preset if available and in composite-custom mode
    if (config.defaultPreset && viewMode === 'composite-custom') {
      try {
        const presetResult = await PresetLoader.loadPreset(config.defaultPreset)
        if (presetResult.success && presetResult.preset) {
          // Convert preset to defaults and merge with territory defaults
          const presetDefaults = PresetLoader.convertToDefaults(presetResult.preset)
          finalDefaults = {
            projections: { ...finalDefaults.projections, ...presetDefaults.projections },
            translations: { ...finalDefaults.translations, ...presetDefaults.translations },
            scales: { ...finalDefaults.scales, ...presetDefaults.scales },
          }
        }
        else {
          // Log warning but continue with fallback defaults
          console.warn(`Failed to load preset '${config.defaultPreset}':`, presetResult.errors)
        }
      }
      catch (error) {
        // Log error but continue with fallback defaults
        console.error(`Error loading preset '${config.defaultPreset}':`, error)
      }
    }

    // Determine composite projection
    const compositeProjection = config.defaultCompositeProjection

    // Determine selected projection
    const selectedProjection = this.getSelectedProjection(specificConfig, atlasService)

    // Get map display defaults
    const mapDisplayDefaults = config.mapDisplayDefaults || {}
    const mapDisplay = {
      showGraticule: mapDisplayDefaults.showGraticule ?? false,
      showSphere: mapDisplayDefaults.showSphere ?? false,
      showCompositionBorders: mapDisplayDefaults.showCompositionBorders ?? false,
      showMapLimits: mapDisplayDefaults.showMapLimits ?? false,
    }

    return {
      viewMode,
      territoryMode,
      projections: finalDefaults.projections,
      translations: finalDefaults.translations,
      scales: finalDefaults.scales,
      compositeProjection,
      selectedProjection,
      mapDisplay,
    }
  }

  /**
   * Get initial configuration for default atlas on app startup
   *
   * @returns Initial configuration
   */
  static async getInitialConfiguration(): Promise<AtlasChangeResult> {
    return this.handleAtlasChange(DEFAULT_ATLAS, getAtlasConfig(DEFAULT_ATLAS).defaultViewMode)
  }

  /**
   * Get territory mode for an atlas
   *
   * @param config - Atlas configuration
   * @returns Territory mode to use
   */
  private static getTerritoryMode(config: any): string {
    // Use configured default territory mode if available
    if (config.defaultTerritoryMode) {
      return config.defaultTerritoryMode
    }
    // Otherwise use first option from territoryModeOptions
    if (config.hasTerritorySelector && config.territoryModeOptions && config.territoryModeOptions.length > 0) {
      return config.territoryModeOptions[0]!.value
    }
    throw new Error('No territory mode options available for atlas')
  }

  /**
   * Get selected projection based on preferences or mainland
   *
   * @param specificConfig - Atlas-specific configuration
   * @param atlasService - Atlas service instance
   * @returns Projection ID to use
   */
  private static getSelectedProjection(
    specificConfig: any,
    atlasService: AtlasService,
  ): string {
    // First, try to get from projection preferences (for wildcard atlases like world)
    const projectionPrefs = specificConfig.projectionPreferences
    if (projectionPrefs?.recommended && projectionPrefs.recommended.length > 0) {
      return projectionPrefs.recommended[0]
    }

    // Otherwise, use mainland territory projection
    const mainland = atlasService.getMainland()
    return mainland?.projectionType || 'natural-earth'
  }
}
