import type { AtlasConfig, TerritoryConfig } from '@/types'
import { logger } from '@/utils/logger'

const debug = logger.atlas.loader

export function getTerritoriesForMode(
  territories: TerritoryConfig[],
  mode: string,
  modeConfig: Record<string, any>,
): TerritoryConfig[] {
  const modeDefinition = modeConfig[mode]
  if (!modeDefinition) {
    return []
  }

  if (modeDefinition.codes.length === 0) {
    return []
  }

  let codes = modeDefinition.codes
  if (codes.includes('*')) {
    codes = territories.map(t => t.code)

    if (modeDefinition.exclude && Array.isArray(modeDefinition.exclude)) {
      codes = codes.filter((code: string) => !modeDefinition.exclude.includes(code))
    }
  }

  const codesSet = new Set(codes)
  return territories.filter(t => codesSet.has(t.code))
}

export function getInitialTerritoryMode(atlasConfig: Pick<AtlasConfig, 'hasTerritorySelector' | 'isWildcard' | 'territoryModeOptions'>): string {
  const options = atlasConfig.territoryModeOptions ?? []
  if (atlasConfig.hasTerritorySelector && options.length > 0) {
    return options[0]!.value
  }

  if (!atlasConfig.hasTerritorySelector || atlasConfig.isWildcard) {
    return 'all-territories'
  }

  throw new Error('No territory mode options available for atlas')
}

export function filterAtlasConfigByPreset(
  atlasConfig: AtlasConfig,
  territoryParameters: Record<string, Record<string, unknown>>,
): AtlasConfig {
  const compositeConfig = atlasConfig.compositeProjectionConfig

  if (!compositeConfig) {
    return atlasConfig
  }

  const territoriesInPreset = new Set(Object.keys(territoryParameters))

  const filteredTerritories = compositeConfig.territories.filter(t =>
    territoriesInPreset.has(t.code),
  )

  debug('Filtered territories: %d in preset, %d filtered', territoriesInPreset.size, filteredTerritories.length)

  return {
    ...atlasConfig,
    compositeProjectionConfig: {
      territories: filteredTerritories,
    },
  }
}
