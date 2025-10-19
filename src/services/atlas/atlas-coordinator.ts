import type { ViewMode } from '@/types'

import { DEFAULT_ATLAS, getAtlasConfig } from '@/core/atlases/registry'
import { AtlasService } from '@/services/atlas/atlas-service'
import { TerritoryDefaultsService } from '@/services/atlas/territory-defaults-service'
import { AtlasMetadataService } from '@/services/presets/atlas-metadata-service'
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
  territoryParameters: Record<string, Record<string, unknown>>
  compositeProjection?: string
  selectedProjection: string
  referenceScale?: number
  canvasDimensions?: { width: number, height: number }
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
    let territoryParameters: Record<string, Record<string, unknown>> = {}
    let referenceScale: number | undefined
    let canvasDimensions: { width: number, height: number } | undefined

    // Load preset if available and in composite-custom mode
    if (config.defaultPreset && viewMode === 'composite-custom') {
      try {
        const presetResult = await PresetLoader.loadPreset(config.defaultPreset)
        if (presetResult.success && presetResult.data && presetResult.data.type === 'composite-custom') {
          // Convert preset config to defaults and merge with territory defaults
          const presetDefaults = PresetLoader.convertToDefaults(presetResult.data.config)
          finalDefaults = {
            projections: { ...finalDefaults.projections, ...presetDefaults.projections },
            translations: { ...finalDefaults.translations, ...presetDefaults.translations },
            scales: { ...finalDefaults.scales, ...presetDefaults.scales },
          }

          // Extract territory-specific projection parameters from preset
          territoryParameters = PresetLoader.extractTerritoryParameters(presetResult.data.config)

          // Extract referenceScale from preset
          referenceScale = presetResult.data.config.referenceScale

          // Extract canvasDimensions from preset (if available)
          canvasDimensions = presetResult.data.config.canvasDimensions
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

    // Get atlas metadata from preset system
    const atlasMetadata = await AtlasMetadataService.getAtlasMetadata(newAtlasId, config.defaultPreset)

    // Determine composite projection from preset metadata
    let finalCompositeProjection = atlasMetadata.metadata?.defaultCompositeProjection

    // If no composite projection is set, find the first available one for this atlas
    // This ensures composite-existing mode always has a valid projection selected
    if (!finalCompositeProjection) {
      const availableComposites = await AtlasMetadataService.getCompositeProjections(newAtlasId, config.defaultPreset)
      if (availableComposites.length > 0) {
        finalCompositeProjection = availableComposites[0]
      }
    }

    // Determine selected projection from preset metadata
    let selectedProjection = await this.getSelectedProjection(newAtlasId, config.defaultPreset)

    // Ensure selected projection is valid for composite modes
    // For composite views, projection must exist in territory projections
    if (viewMode.startsWith('composite-') && !finalDefaults.projections[atlasService.getMainland()?.code || '']) {
      // Fall back to first available projection or mercator
      const mainlandCode = atlasService.getMainland()?.code
      const mainlandProjection = mainlandCode ? finalDefaults.projections[mainlandCode] : undefined
      selectedProjection = mainlandProjection || 'mercator'
    }

    // Map display defaults are now controlled by UI store only
    const mapDisplay = {
      showGraticule: false,
      showSphere: false,
      showCompositionBorders: true,
      showMapLimits: true,
    }

    return {
      viewMode,
      territoryMode,
      projections: finalDefaults.projections,
      translations: finalDefaults.translations,
      scales: finalDefaults.scales,
      territoryParameters,
      compositeProjection: finalCompositeProjection,
      selectedProjection,
      referenceScale,
      canvasDimensions,
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
   * Get selected projection for an atlas
   * @param atlasId - Atlas ID
   * @param defaultPreset - Default preset name
   * @returns Projection ID to use
   */
  private static async getSelectedProjection(
    atlasId: string,
    defaultPreset: string | undefined,
  ): Promise<string> {
    // First, try to get from projection preferences (for wildcard atlases like world)
    const projectionPrefs = await AtlasMetadataService.getProjectionPreferences(atlasId, defaultPreset)
    if (projectionPrefs?.recommended && projectionPrefs.recommended.length > 0) {
      return projectionPrefs.recommended[0]!
    }

    // Otherwise, use natural-earth as default (no config-level defaults)
    return 'natural-earth'
  }
}
