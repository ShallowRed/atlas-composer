/**
 * Atlas Metadata Service
 *
 * Provides a clean API for accessing atlas-level projection metadata
 * that has been extracted from atlas configurations and stored in preset files.
 *
 * Key responsibilities:
 * - Load atlas projection metadata from preset files
 * - Provide fallback defaults for atlases without presets
 * - Cache metadata for performance
 * - Handle projection preferences, parameters, and display defaults
 */

import type { AtlasProjectionMetadata, LoadResult, Preset } from '@/core/presets'

import { logger } from '@/utils/logger'
import { PresetLoader } from './preset-loader'

const debug = logger.presets.metadata

export interface AtlasMetadataResult {
  success: boolean
  metadata?: AtlasProjectionMetadata
  errors: string[]
  source: 'preset' | 'fallback'
}

/**
 * Cache for loaded atlas metadata to avoid repeated file loads
 */
const metadataCache = new Map<string, AtlasProjectionMetadata>()

/**
 * Service for accessing atlas projection metadata from preset files
 */
export class AtlasMetadataService {
  /**
   * Get atlas projection metadata for a given atlas
   *
   * @param atlasId - Atlas identifier (e.g., 'france', 'portugal')
   * @param defaultPreset - Default preset name to load metadata from
   * @returns Atlas metadata result with projection configuration
   */
  static async getAtlasMetadata(atlasId: string, defaultPreset?: string): Promise<AtlasMetadataResult> {
    // Check cache first
    const cacheKey = `${atlasId}-${defaultPreset || 'default'}`
    const cached = metadataCache.get(cacheKey)
    if (cached) {
      return {
        success: true,
        metadata: cached,
        errors: [],
        source: 'preset',
      }
    }

    // Try to load from preset
    if (defaultPreset) {
      try {
        const presetResult: LoadResult<Preset> = await PresetLoader.loadPreset(defaultPreset)

        if (presetResult.success && presetResult.data && presetResult.data.type === 'composite-custom') {
          const metadata = presetResult.data.config.atlasMetadata

          if (metadata) {
            // Cache the result
            metadataCache.set(cacheKey, metadata)

            return {
              success: true,
              metadata,
              errors: [],
              source: 'preset',
            }
          }
        }
      }
      catch (error) {
        debug('Failed to load preset metadata for %s: %o', atlasId, error)
      }
    }

    // Return fallback defaults
    const fallbackMetadata = this.getFallbackMetadata(atlasId)
    return {
      success: true,
      metadata: fallbackMetadata,
      errors: [],
      source: 'fallback',
    }
  }

  /**
   * Get composite projections available for an atlas
   *
   * @param atlasId - Atlas identifier
   * @param defaultPreset - Default preset name
   * @returns Array of composite projection IDs
   */
  static async getCompositeProjections(atlasId: string, defaultPreset?: string): Promise<string[]> {
    const result = await this.getAtlasMetadata(atlasId, defaultPreset)
    return result.metadata?.compositeProjections || this.getDefaultCompositeProjections(atlasId)
  }

  /**
   * Get projection preferences for an atlas
   *
   * @param atlasId - Atlas identifier
   * @param defaultPreset - Default preset name
   * @returns Projection preferences object
   */
  static async getProjectionPreferences(atlasId: string, defaultPreset?: string): Promise<AtlasProjectionMetadata['projectionPreferences']> {
    const result = await this.getAtlasMetadata(atlasId, defaultPreset)
    return result.metadata?.projectionPreferences
  }

  /**
   * Get projection parameters for an atlas
   *
   * @param atlasId - Atlas identifier
   * @param defaultPreset - Default preset name
   * @returns Projection parameters object
   */
  static async getProjectionParameters(atlasId: string, defaultPreset?: string): Promise<AtlasProjectionMetadata['projectionParameters']> {
    const result = await this.getAtlasMetadata(atlasId, defaultPreset)
    return result.metadata?.projectionParameters
  }

  /**
   * Clear metadata cache (useful for testing or when presets are updated)
   */
  static clearCache(): void {
    metadataCache.clear()
  }

  /**
   * Get fallback metadata for atlases without presets
   *
   * @param atlasId - Atlas identifier
   * @returns Basic fallback metadata
   */
  private static getFallbackMetadata(atlasId: string): AtlasProjectionMetadata {
    return {
      compositeProjections: this.getDefaultCompositeProjections(atlasId),
      projectionPreferences: {
        recommended: ['natural-earth', 'robinson', 'mercator'],
        default: {
          mainland: 'natural-earth',
          overseas: 'mercator',
        },
      },
    }
  }

  /**
   * Get default composite projections for an atlas
   *
   * @param atlasId - Atlas identifier
   * @returns Array of default composite projection IDs
   */
  private static getDefaultCompositeProjections(atlasId: string): string[] {
    // Return common default based on atlas ID
    switch (atlasId) {
      case 'france':
        return ['conic-conformal-france']
      case 'portugal':
        return ['conic-conformal-portugal']
      case 'spain':
        return ['conic-conformal-spain']
      case 'usa':
        return ['albers-usa', 'albers-usa-composite']
      case 'europe':
        return ['conic-conformal-europe']
      default:
        return [`conic-conformal-${atlasId}`]
    }
  }
}
