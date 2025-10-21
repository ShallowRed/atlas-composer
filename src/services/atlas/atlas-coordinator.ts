import type { ViewMode } from '@/types'

import { DEFAULT_ATLAS, getAtlasConfig, getAvailableViewModes, getDefaultPreset, getDefaultViewMode } from '@/core/atlases/registry'
import { AtlasService } from '@/services/atlas/atlas-service'
import { TerritoryDefaultsService } from '@/services/atlas/territory-defaults-service'
import { AtlasMetadataService } from '@/services/presets/atlas-metadata-service'
import { PresetLoader } from '@/services/presets/preset-loader'
import { logger } from '@/utils/logger'

const debug = logger.atlas.service

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
    const availableViewModes = getAvailableViewModes(newAtlasId)
    const viewMode = availableViewModes.includes(currentViewMode)
      ? currentViewMode
      : getDefaultViewMode(newAtlasId)

    // Determine territory mode
    const territoryMode = this.getTerritoryMode(config)

    // Initialize territory defaults
    const territories = atlasService.getAllTerritories()
    let finalDefaults = TerritoryDefaultsService.initializeAll(territories, 'mercator')
    let territoryParameters: Record<string, Record<string, unknown>> = {}
    let referenceScale: number | undefined
    let canvasDimensions: { width: number, height: number } | undefined

    // Get default preset from registry
    const defaultPreset = getDefaultPreset(newAtlasId)
    const defaultPresetId = defaultPreset?.id

    // Load preset if available and in composite-custom mode
    if (defaultPresetId && viewMode === 'composite-custom') {
      try {
        const presetResult = await PresetLoader.loadPreset(defaultPresetId)
        if (presetResult.success && presetResult.data && presetResult.data.type === 'composite-custom') {
          // Convert preset config to defaults - territories not in preset will NOT be rendered
          const presetDefaults = PresetLoader.convertToDefaults(presetResult.data.config)
          // Use ONLY preset defaults (no fallback merge) so missing territories don't get defaults
          finalDefaults = presetDefaults

          // Extract territory-specific projection parameters from preset
          territoryParameters = PresetLoader.extractTerritoryParameters(presetResult.data.config)

          // Debug: Log what was extracted
          debug('Extracted territory parameters: %o', Object.keys(territoryParameters).map(code => ({
            code,
            hasProjectionId: !!territoryParameters[code]?.projectionId,
            projectionId: territoryParameters[code]?.projectionId,
            allKeys: Object.keys(territoryParameters[code] || {}),
          })))

          // Handle territory mismatch: territories not in preset will NOT be rendered (no fallback)
          const presetTerritoryCodes = new Set(Object.keys(presetDefaults.projections))
          const missingTerritories = territories.filter(t => !presetTerritoryCodes.has(t.code))

          if (missingTerritories.length > 0) {
            debug(
              'Preset "%s" defines %d territories, atlas allows %d. %d territories will NOT be rendered: %s',
              defaultPresetId,
              presetTerritoryCodes.size,
              territories.length,
              missingTerritories.length,
              missingTerritories.map(t => t.code).join(', '),
            )
          }

          // Extract referenceScale from preset
          referenceScale = presetResult.data.config.referenceScale

          // Extract canvasDimensions from preset (if available)
          canvasDimensions = presetResult.data.config.canvasDimensions
        }
        else {
          // Log warning but continue with fallback defaults
          debug('Failed to load preset "%s": %o', defaultPresetId, presetResult.errors)
        }
      }
      catch (error) {
        // Log error but continue with fallback defaults
        debug('Error loading preset "%s": %o', defaultPresetId, error)
      }
    }

    // Get atlas metadata from preset system
    const atlasMetadata = await AtlasMetadataService.getAtlasMetadata(newAtlasId, defaultPresetId)

    // Determine composite projection from preset metadata
    let finalCompositeProjection = atlasMetadata.metadata?.defaultCompositeProjection

    // If no composite projection is set, find the first available one for this atlas
    // This ensures built-in-composite mode always has a valid projection selected
    if (!finalCompositeProjection) {
      const availableComposites = await AtlasMetadataService.getCompositeProjections(newAtlasId, defaultPresetId)
      if (availableComposites.length > 0) {
        finalCompositeProjection = availableComposites[0]
      }
    }

    // Determine selected projection from preset metadata
    let selectedProjection = await this.getSelectedProjection(newAtlasId, defaultPresetId)

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
    return this.handleAtlasChange(DEFAULT_ATLAS, getDefaultViewMode(DEFAULT_ATLAS))
  }

  /**
   * Get territory mode for an atlas
   *
   * @param config - Atlas configuration
   * @returns Territory mode to use
   */
  private static getTerritoryMode(config: any): string {
    // Use first option from territoryModeOptions if available
    if (config.hasTerritorySelector && config.territoryModeOptions && config.territoryModeOptions.length > 0) {
      return config.territoryModeOptions[0]!.value
    }

    // For atlases without territory selector (e.g., wildcard atlases like world)
    // Return a default mode identifier
    if (!config.hasTerritorySelector || config.isWildcard) {
      return 'all-territories'
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
