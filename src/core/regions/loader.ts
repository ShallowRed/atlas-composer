/**
 * Unified Config Loader
 * Adapter to transform shared JSON configs into complete region configurations
 */

import type {
  GeoDataConfig,
  RegionConfig,
  TerritoryConfig,
  TerritoryGroupConfig,
  TerritoryModeConfig,
} from '@/types/territory'

/**
 * Projection parameters for a region
 */
export interface ProjectionParams {
  center: {
    longitude: number
    latitude: number
  }
  rotate: {
    mainland: [number, number]
    azimuthal: [number, number]
  }
  parallels: {
    conic: [number, number]
  }
}

/**
 * Default composite projection settings
 */
export interface CompositeProjectionDefaults {
  territoryProjections: Record<string, string>
  territoryTranslations: Record<string, { x: number, y: number }>
  territoryScales: Record<string, number>
}

/**
 * Region-specific configuration
 */
export interface RegionSpecificConfig {
  projectionParams: ProjectionParams
  territoryModes: Record<string, TerritoryModeConfig>
  territoryGroups?: Record<string, TerritoryGroupConfig>
  defaultCompositeConfig?: CompositeProjectionDefaults
}

/**
 * Complete loaded config for a region
 */
export interface LoadedRegionConfig {
  regionConfig: RegionConfig
  regionSpecificConfig: RegionSpecificConfig
  territories: {
    mainland: TerritoryConfig
    overseas: TerritoryConfig[]
    all: TerritoryConfig[]
  }
}

/**
 * Transform territory from JSON to TerritoryConfig
 */
function transformTerritory(territory: any): TerritoryConfig {
  return {
    code: territory.code,
    name: territory.name,
    ...(territory.shortName && { shortName: territory.shortName }),
    ...(territory.region && { region: territory.region }),
    center: territory.center,
    offset: territory.rendering?.offset || [0, 0],
    bounds: territory.bounds,
    ...(territory.rendering?.projectionType && {
      projectionType: territory.rendering.projectionType,
    }),
    ...(territory.rendering?.scale && { scale: territory.rendering.scale }),
    ...(territory.rendering?.rotate && { rotate: territory.rendering.rotate }),
    ...(territory.rendering?.parallels && { parallels: territory.rendering.parallels }),
    ...(territory.rendering?.clipExtent && { clipExtent: territory.rendering.clipExtent }),
    ...(territory.rendering?.baseScaleMultiplier && {
      baseScaleMultiplier: territory.rendering.baseScaleMultiplier,
    }),
  }
}

/**
 * Extract territories from config
 */
function extractTerritories(config: any) {
  const mainlandTerritory = config.territories.find((t: any) => t.role === 'mainland')
  const overseasTerritories = config.territories.filter((t: any) => t.role === 'overseas')

  if (!mainlandTerritory) {
    throw new Error(`No mainland territory found in ${config.id}`)
  }

  const mainland = transformTerritory(mainlandTerritory)
  const overseas = overseasTerritories.map(transformTerritory)
  const all = [mainland, ...overseas]

  return { mainland, overseas, all }
}

/**
 * Create territory mode configurations
 */
function createTerritoryModes(
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
function createTerritoryGroups(config: any): Record<string, TerritoryGroupConfig> {
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
 * Create composite projection defaults
 */
function createCompositeDefaults(territories: TerritoryConfig[]): CompositeProjectionDefaults {
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
 * Create GeoDataConfig
 */
function createGeoDataConfig(config: any, territories: any): GeoDataConfig {
  return {
    dataPath: `/data/${config.id}-territories-50m.json`,
    metadataPath: `/data/${config.id}-metadata-50m.json`,
    topologyObjectName: 'territories',
    mainlandCode: territories.mainland.code,
    mainlandBounds: territories.mainland.bounds,
    overseasTerritories: territories.overseas,
  }
}

/**
 * Create RegionConfig
 */
function createRegionConfig(
  config: any,
  territories: any,
  geoDataConfig: GeoDataConfig,
  territoryModes: Record<string, TerritoryModeConfig>,
  defaultCompositeConfig: CompositeProjectionDefaults,
): RegionConfig {
  return {
    id: config.id,
    name: config.name,
    geoDataConfig,
    supportedViewModes: ['split', 'composite-existing', 'composite-custom', 'unified'],
    defaultViewMode: 'composite-custom',
    defaultTerritoryMode:
      config.modes?.[config.modes.length - 1]?.id || 'all-territories',
    defaultCompositeConfig,
    compositeProjections: [`conic-conformal-${config.id}`],
    defaultCompositeProjection: `conic-conformal-${config.id}`,
    compositeProjectionConfig: {
      mainland: territories.mainland,
      overseasTerritories: territories.overseas,
    },
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
}

/**
 * Load complete region configuration from JSON config
 *
 * This is the main entry point that transforms a JSON config
 * into all necessary configuration objects for the application.
 */
export function loadRegionConfig(jsonConfig: any): LoadedRegionConfig {
  // Extract territories
  const territories = extractTerritories(jsonConfig)

  // Create projection parameters
  const projectionParams: ProjectionParams = jsonConfig.projection as ProjectionParams

  // Create territory modes and groups
  const territoryModes = createTerritoryModes(jsonConfig, territories.mainland.code)
  const territoryGroups = createTerritoryGroups(jsonConfig)

  // Create composite defaults
  const defaultCompositeConfig = createCompositeDefaults(territories.all)

  // Create geo data config
  const geoDataConfig = createGeoDataConfig(jsonConfig, territories)

  // Create region config
  const regionConfig = createRegionConfig(
    jsonConfig,
    territories,
    geoDataConfig,
    territoryModes,
    defaultCompositeConfig,
  )

  // Create region-specific config
  const regionSpecificConfig: RegionSpecificConfig = {
    projectionParams,
    territoryModes,
    territoryGroups,
    defaultCompositeConfig,
  }

  return {
    regionConfig,
    regionSpecificConfig,
    territories,
  }
}
