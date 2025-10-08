/**
 * Generic Region Config Adapter
 * Transforms unified JSON configs to frontend region configurations
 */

import type {
  CompositeProjectionDefaults,
  ProjectionParams,
  RegionSpecificConfig,
} from '@/config/regions/types'
import type {
  GeoDataConfig,
  RegionConfig,
  TerritoryConfig,
  TerritoryGroupConfig,
  TerritoryModeConfig,
} from '@/types/territory'

interface TerritoryExports {
  mainland: TerritoryConfig
  overseas: TerritoryConfig[]
  all: TerritoryConfig[]
}

/**
 * Create territory mode configurations
 */
export function createTerritoryModes(
  config: any,
  mainlandCode: string,
): Record<string, TerritoryModeConfig> {
  return Object.fromEntries(
    (config.modes || []).map((mode: any) => [
      mode.id,
      {
        label: mode.label,
        codes: mode.territories.filter((code: string) => code !== mainlandCode),
      },
    ]),
  )
}

/**
 * Create territory group configurations
 */
export function createTerritoryGroups(config: any): Record<string, TerritoryGroupConfig> {
  return Object.fromEntries(
    (config.groups || []).map((group: any) => [
      group.id.toUpperCase(),
      {
        label: group.label,
        codes: group.territories,
      },
    ]),
  )
}

/**
 * Create composite projection config with default values
 */
export function createCompositeConfig(
  territories: TerritoryConfig[],
): CompositeProjectionDefaults {
  return {
    territoryProjections: Object.fromEntries(
      territories.map(t => [t.code, t.projectionType || 'mercator']),
    ),
    territoryTranslations: Object.fromEntries(
      territories.map(t => [t.code, { x: t.offset[0], y: t.offset[1] }]),
    ),
    territoryScales: Object.fromEntries(territories.map(t => [t.code, 1.0])),
  }
}

/**
 * Create all region config exports from unified config
 */
export function createRegionConfigExports(config: any, territories: TerritoryExports) {
  const projectionParams: ProjectionParams = config.projection as ProjectionParams
  const territoryModes = createTerritoryModes(config, territories.mainland.code)
  const territoryGroups = createTerritoryGroups(config)
  const defaultCompositeConfig = createCompositeConfig(territories.all)

  const geoDataConfig: GeoDataConfig = {
    dataPath: `/data/${config.id}-territories-50m.json`,
    metadataPath: `/data/${config.id}-metadata-50m.json`,
    topologyObjectName: 'territories',
    mainlandCode: territories.mainland.code,
    mainlandBounds: territories.mainland.bounds,
    overseasTerritories: territories.overseas,
  }

  const compositeProjectionConfig = {
    mainland: territories.mainland,
    overseasTerritories: territories.overseas,
  }

  const regionConfig: RegionConfig = {
    id: config.id,
    name: config.name,
    geoDataConfig,
    supportedViewModes: ['split', 'composite-existing', 'composite-custom', 'unified'],
    defaultViewMode: 'composite-custom',
    defaultTerritoryMode: config.modes?.[config.modes.length - 1]?.id || 'all-territories',
    defaultCompositeConfig,
    compositeProjections: [`conic-conformal-${config.id}`],
    defaultCompositeProjection: `conic-conformal-${config.id}`,
    compositeProjectionConfig,
    splitModeConfig: {
      mainlandTitle: territories.mainland.name,
      mainlandCode: territories.mainland.code,
      territoriesTitle: 'Overseas Territories',
    },
    hasTerritorySelector: true,
    territoryModeOptions: (config.modes || []).map((mode: any) => ({
      value: mode.id,
      label: territoryModes[mode.id]!.label,
    })),
  }

  const regionSpecificConfig: RegionSpecificConfig = {
    projectionParams,
    territoryModes,
    territoryGroups,
    defaultCompositeConfig,
  }

  return {
    projectionParams,
    territoryModes,
    territoryGroups,
    defaultCompositeConfig,
    geoDataConfig,
    compositeProjectionConfig,
    regionConfig,
    regionSpecificConfig,
  }
}
