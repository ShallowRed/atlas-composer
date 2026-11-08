import type { AtlasProjectionMetadata } from '@/core/presets'
import type { AtlasId, PresetId, ProjectionId } from '@/types/branded'

import { getDefaultCompositeProjections } from '@/core/projections/defaults'
import { logger } from '@/utils/logger'
import { PresetLoader } from './preset-loader'

const debug = logger.presets.metadata

const metadataCache = new Map<string, AtlasProjectionMetadata>()

export class AtlasMetadataService {
  private static async getAtlasMetadata(atlasId: AtlasId, defaultPreset?: PresetId): Promise<AtlasProjectionMetadata> {
    const cacheKey = `${atlasId}-${defaultPreset || 'default'}`
    const cached = metadataCache.get(cacheKey)
    if (cached) {
      return cached
    }

    if (defaultPreset) {
      const presetResult = await PresetLoader.loadPreset(defaultPreset)

      if (!presetResult.ok) {
        debug('Failed to load preset metadata for %s: %o', atlasId, presetResult.error)
      }
      else if (presetResult.value.type === 'composite-custom' && presetResult.value.config.atlasMetadata) {
        const metadata = presetResult.value.config.atlasMetadata
        metadataCache.set(cacheKey, metadata)
        return metadata
      }
    }

    return this.getFallbackMetadata(atlasId)
  }

  private static async getCompositeProjections(atlasId: AtlasId, defaultPreset?: PresetId): Promise<ProjectionId[]> {
    const metadata = await this.getAtlasMetadata(atlasId, defaultPreset)
    return (metadata.compositeProjections || getDefaultCompositeProjections(atlasId)) as ProjectionId[]
  }

  private static async getProjectionPreferences(atlasId: AtlasId, defaultPreset?: PresetId): Promise<AtlasProjectionMetadata['projectionPreferences']> {
    const metadata = await this.getAtlasMetadata(atlasId, defaultPreset)
    return metadata.projectionPreferences
  }

  static async getDefaultCompositeProjection(atlasId: AtlasId, defaultPreset?: PresetId): Promise<ProjectionId | undefined> {
    const availableComposites = await this.getCompositeProjections(atlasId, defaultPreset)
    return availableComposites[0]
  }

  static async getRecommendedProjection(atlasId: AtlasId, defaultPreset?: PresetId): Promise<ProjectionId> {
    const projectionPrefs = await this.getProjectionPreferences(atlasId, defaultPreset)
    return (projectionPrefs?.recommended?.[0] ?? 'natural-earth') as ProjectionId
  }

  private static getFallbackMetadata(atlasId: AtlasId): AtlasProjectionMetadata {
    return {
      compositeProjections: getDefaultCompositeProjections(atlasId),
      projectionPreferences: {
        recommended: ['natural-earth', 'robinson', 'mercator'],
      },
    }
  }
}
