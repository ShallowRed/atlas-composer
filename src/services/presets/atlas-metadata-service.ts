import type { AtlasProjectionMetadata, LoadResult, Preset } from '@/core/presets'
import type { AtlasId, PresetId, ProjectionId } from '@/types/branded'

import { getDefaultCompositeProjections } from '@/core/projections/defaults'
import { logger } from '@/utils/logger'
import { PresetLoader } from './preset-loader'

const debug = logger.presets.metadata

export interface AtlasMetadataResult {
  success: boolean
  metadata?: AtlasProjectionMetadata
  errors: string[]
  source: 'preset' | 'fallback'
}

const metadataCache = new Map<string, AtlasProjectionMetadata>()

export class AtlasMetadataService {
  static async getAtlasMetadata(atlasId: AtlasId, defaultPreset?: PresetId): Promise<AtlasMetadataResult> {
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

    if (defaultPreset) {
      try {
        const presetResult: LoadResult<Preset> = await PresetLoader.loadPreset(defaultPreset)

        if (presetResult.success && presetResult.data && presetResult.data.type === 'composite-custom') {
          const metadata = presetResult.data.config.atlasMetadata

          if (metadata) {
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

    const fallbackMetadata = this.getFallbackMetadata(atlasId)
    return {
      success: true,
      metadata: fallbackMetadata,
      errors: [],
      source: 'fallback',
    }
  }

  static async getCompositeProjections(atlasId: AtlasId, defaultPreset?: PresetId): Promise<ProjectionId[]> {
    const result = await this.getAtlasMetadata(atlasId, defaultPreset)
    return (result.metadata?.compositeProjections || getDefaultCompositeProjections(atlasId)) as ProjectionId[]
  }

  static async getProjectionPreferences(atlasId: AtlasId, defaultPreset?: PresetId): Promise<AtlasProjectionMetadata['projectionPreferences']> {
    const result = await this.getAtlasMetadata(atlasId, defaultPreset)
    return result.metadata?.projectionPreferences
  }

  static async getProjectionParameters(atlasId: AtlasId, defaultPreset?: PresetId): Promise<AtlasProjectionMetadata['projectionParameters']> {
    const result = await this.getAtlasMetadata(atlasId, defaultPreset)
    return result.metadata?.projectionParameters
  }

  private static getFallbackMetadata(atlasId: AtlasId): AtlasProjectionMetadata {
    return {
      compositeProjections: getDefaultCompositeProjections(atlasId),
      projectionPreferences: {
        recommended: ['natural-earth', 'robinson', 'mercator'],
      },
    }
  }

  static clearCache(): void {
    metadataCache.clear()
  }
}
