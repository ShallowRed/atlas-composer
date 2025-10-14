/**
 * Unified Config Loader
 * Adapter to transform shared JSON configs into complete atlas configurations
 */

import type { I18nValue, JSONAtlasConfig, JSONTerritoryConfig } from '#types'
import type {
  AtlasConfig,
  GeoDataConfig,
  TerritoryConfig,
  TerritoryGroupConfig,
  TerritoryModeConfig,
} from '@/types'
import { getCurrentLocale, resolveI18nValue } from '@/core/atlases/i18n-utils'

// Internal loader types - defined here to avoid separation of concerns violations
export interface ProjectionParams {
  center: { longitude: number, latitude: number }
  rotate: { mainland: [number, number], azimuthal: [number, number] }
  parallels: { conic: [number, number] }
  scale?: number // Optional custom scale for manual mode
}

export interface ProjectionPreferences {
  exclude?: string[]
  categoryOrder?: string[]
  recommended?: string[]
  prohibited?: string[]
}

export interface AtlasSpecificConfig {
  projectionParams: ProjectionParams
  territoryModes: Record<string, TerritoryModeConfig>
  territoryGroups?: Record<string, TerritoryGroupConfig>
  projectionPreferences?: ProjectionPreferences
  // Raw i18n values for reactive translation
  rawModeLabels: Record<string, I18nValue>
  rawGroupLabels?: Record<string, I18nValue>
}

export interface LoadedTerritories {
  type: 'single-focus' | 'equal-members' | 'hierarchical'
  mainland: TerritoryConfig
  mainlands?: TerritoryConfig[]
  overseas: TerritoryConfig[]
  all: TerritoryConfig[]
  isWildcard?: boolean // True if territories should be loaded dynamically from data file
}

export interface LoadedAtlasConfig {
  atlasConfig: AtlasConfig
  atlasSpecificConfig: AtlasSpecificConfig
  territories: LoadedTerritories
}

// Re-export for convenience
export type { CompositeProjectionDefaults } from '@/types'

/**
 * Transform territory from JSON to TerritoryConfig
 * Resolves i18n values to strings for the current locale
 */
function transformTerritory(territory: JSONTerritoryConfig, locale: string): TerritoryConfig {
  return {
    code: territory.code,
    name: resolveI18nValue(territory.name, locale),
    ...(territory.shortName && { shortName: resolveI18nValue(territory.shortName, locale) }),
    ...(territory.region && { region: resolveI18nValue(territory.region, locale) }),
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
 * Extract territories and detect pattern type from role usage
 */
function extractTerritories(config: JSONAtlasConfig, locale: string) {
  // Handle wildcard "*" - return placeholder for dynamic loading
  // Territories will be loaded by geo-data service from topology data
  if (config.territories === '*') {
    // Create placeholder territory for wildcard atlases
    const placeholderTerritory: TerritoryConfig = {
      code: 'WORLD',
      name: 'World',
      center: [0, 0],
      offset: [0, 0],
      bounds: [[-180, -90], [180, 90]],
    }

    return {
      type: 'equal-members' as const,
      mainland: placeholderTerritory,
      mainlands: [placeholderTerritory],
      overseas: [],
      all: [placeholderTerritory],
      isWildcard: true, // Flag for geo-data service
    }
  }

  // Collect primary territories and members
  const primaryTerritories = config.territories.filter(t => t.role === 'primary')
  const memberTerritories = config.territories.filter(t => t.role === 'member')
  const secondaryTerritories = config.territories.filter(t => t.role === 'secondary')

  // Validate: must have either primaries or members, not both
  if (primaryTerritories.length > 0 && memberTerritories.length > 0) {
    throw new Error(
      `Atlas ${config.id} has both 'primary' and 'member' roles. `
      + `Use 'primary'+'secondary' for single-focus or 'member' for equal-members pattern.`,
    )
  }

  if (primaryTerritories.length === 0 && memberTerritories.length === 0) {
    throw new Error(`No primary or member territories found in ${config.id}`)
  }

  // Single-focus pattern: 1 primary + N secondary territories
  if (primaryTerritories.length > 0) {
    if (primaryTerritories.length > 1) {
      throw new Error(
        `Atlas ${config.id} has multiple 'primary' territories. `
        + `For equal territories, use 'member' role instead.`,
      )
    }

    const mainland = transformTerritory(primaryTerritories[0]!, locale)
    const overseas = secondaryTerritories.map(t => transformTerritory(t, locale))
    const all = [mainland, ...overseas]

    return {
      type: 'single-focus' as const,
      mainland,
      overseas,
      all,
      mainlands: undefined, // Not used in single-focus pattern
    }
  }

  // Equal-members pattern: N equal members + optional secondary territories
  else {
    const mainlands = memberTerritories.map(t => transformTerritory(t, locale))
    const overseas = secondaryTerritories.map(t => transformTerritory(t, locale))
    const all = [...mainlands, ...overseas]

    // Use first member as representative (for backward compatibility)
    const primaryMainland = mainlands[0]!

    return {
      type: 'equal-members' as const,
      mainland: primaryMainland, // For backward compatibility, use first as representative
      mainlands,
      overseas,
      all,
    }
  }
}

/**
 * Create territory mode configurations
 * Resolves i18n values for mode labels
 */
function createTerritoryModes(
  config: JSONAtlasConfig,
  mainlandCode: string,
  isSingleFocusPattern: boolean,
  locale: string,
  allTerritoryCodes?: string[],
): Record<string, TerritoryModeConfig> {
  return Object.fromEntries(
    (config.modes || []).map((mode) => {
      let codes = mode.territories

      // For wildcard modes, keep the "*" marker for runtime resolution
      // For non-wildcard modes with known territories, process normally
      if (codes.includes('*') && !allTerritoryCodes) {
        // Wildcard atlas (like world): keep "*" for runtime resolution
        codes = ['*']
      }
      else if (codes.includes('*') && allTerritoryCodes) {
        // Non-wildcard atlas with explicit territories: expand now
        codes = [...allTerritoryCodes]

        // Handle exclusions
        if (mode.exclude && Array.isArray(mode.exclude)) {
          const excludeList = mode.exclude
          codes = codes.filter((code: string) => !excludeList.includes(code))
        }
      }

      // For single-focus atlases (France, Portugal): filter out primary code (it's shown separately)
      // For equal-members atlases (EU, World): include all codes (all territories are equal)
      if (isSingleFocusPattern && !codes.includes('*')) {
        codes = codes.filter((code: string) => code !== mainlandCode)
      }

      return [
        mode.id,
        {
          label: resolveI18nValue(mode.label, locale),
          codes,
          exclude: mode.exclude, // Store exclusions for runtime resolution
        },
      ]
    }),
  )
}

/**
 * Create territory group configurations
 * Resolves i18n values for group labels
 */
function createTerritoryGroups(config: JSONAtlasConfig, locale: string): Record<string, TerritoryGroupConfig> {
  return Object.fromEntries(
    (config.groups || []).map(group => [
      group.id.toUpperCase(),
      {
        label: resolveI18nValue(group.label, locale),
        codes: group.territories,
      },
    ]),
  )
}

/**
 * Create composite projection defaults
 */
/**
 * Create GeoDataConfig
 */
function createGeoDataConfig(config: JSONAtlasConfig, territories: LoadedTerritories): GeoDataConfig {
  const baseUrl = import.meta.env.BASE_URL

  // Use dataSources provided in config
  const dataPath = `${baseUrl}data/${config.dataSources.territories}`
  const metadataPath = `${baseUrl}data/${config.dataSources.metadata}`

  return {
    dataPath,
    metadataPath,
    // World atlas uses 'countries' as object name, others use 'territories'
    topologyObjectName: territories.isWildcard ? 'countries' : 'territories',
    // For equal-members atlases, don't set a single primary code (all territories are equal)
    mainlandCode: territories.type === 'single-focus' ? territories.mainland.code : undefined,
    mainlandBounds: territories.mainland.bounds,
    // For equal-members atlases (like EU), include all territories (members + secondary)
    // For single-focus atlases, only include secondary territories
    overseasTerritories: territories.type === 'equal-members'
      ? [...(territories.mainlands || []), ...territories.overseas]
      : territories.overseas,
    // Pass wildcard flag from territories configuration
    isWildcard: territories.isWildcard === true,
  }
}

/**
 * Create RegionConfig
 */
/**
 * Create the main atlas configuration object
 * Resolves i18n values for atlas-level fields
 */
function createAtlasConfig(
  config: JSONAtlasConfig,
  territories: LoadedTerritories,
  geoDataConfig: GeoDataConfig,
  territoryModes: Record<string, TerritoryModeConfig>,
  locale: string,
): AtlasConfig {
  // Use view modes from config if specified, otherwise default to all modes
  const supportedViewModes = (config.viewModes || ['split', 'composite-existing', 'composite-custom', 'unified']) as Array<'split' | 'composite-existing' | 'composite-custom' | 'unified'>
  const defaultViewMode = config.defaultViewMode || 'composite-custom'

  const mapDisplayDefaults = {
    showGraticule: false,
    showCompositionBorders: false,
    showMapLimits: false,
    ...(config.mapDisplayDefaults || {}),
  }

  // Composite projections: explicitly defined in config or empty array
  // For wildcard atlases (like world), no composite projections (unified view only)
  // For other atlases, use config.compositeProjections if provided
  const compositeProjections = territories.isWildcard
    ? []
    : (config.compositeProjections || [])

  const defaultCompositeProjection = territories.isWildcard
    ? undefined
    : (config.defaultCompositeProjection || compositeProjections[0])

  return {
    id: config.id,
    name: resolveI18nValue(config.name, locale),
    category: config.category,
    pattern: territories.type,
    geoDataConfig,
    supportedViewModes,
    defaultViewMode,
    defaultTerritoryMode:
      config.modes?.[config.modes.length - 1]?.id || 'all-territories',
    compositeProjections,
    defaultCompositeProjection,
    defaultPreset: config.defaultPreset,
    availablePresets: config.availablePresets || [],
    // For wildcard atlases, compositeProjectionConfig is not needed (unified view only)
    compositeProjectionConfig: territories.isWildcard
      ? undefined
      : territories.type === 'single-focus'
        ? {
            type: 'single-focus',
            mainland: territories.mainland,
            overseasTerritories: territories.overseas,
          }
        : {
            type: 'equal-members',
            mainlands: territories.mainlands!,
            overseasTerritories: territories.overseas,
          },
    splitModeConfig: {
      mainlandTitle: territories.type === 'single-focus'
        ? `atlas.territories.${config.id}.mainland`
        : `atlas.territories.${config.id}.territories`,
      mainlandCode: territories.mainland?.code,
      territoriesTitle: territories.type === 'single-focus'
        ? `atlas.territories.${config.id}.overseas`
        : `atlas.territories.${config.id}.territories`,
    },
    hasTerritorySelector: (config.modes || []).length > 0,
    isWildcard: territories.isWildcard === true,
    territoryModeOptions: (config.modes || []).map(mode => ({
      value: mode.id,
      label: territoryModes[mode.id]!.label,
      translated: true, // Labels from config are already translated via resolveI18nValue
    })),
    mapDisplayDefaults,
  }
}

/**
 * Load complete atlas configuration from JSON config
 *
 * This is the main entry point that transforms a JSON config
 * into all necessary configuration objects for the application.
 *
 * Resolves i18n values based on current locale.
 */
export function loadAtlasConfig(jsonConfig: JSONAtlasConfig): LoadedAtlasConfig {
  // Get current locale for i18n resolution
  const locale = getCurrentLocale()

  // Extract territories
  const territories = extractTerritories(jsonConfig, locale)

  // Create projection parameters
  const projectionParams: ProjectionParams = jsonConfig.projection as ProjectionParams

  // Create territory modes and groups
  const isSingleFocusPattern = territories.type === 'single-focus'
  // For wildcard atlases, we'll need to get codes from the actual data later
  // For now, use placeholder or generate from config
  const allTerritoryCodes = territories.isWildcard
    ? undefined // Will be resolved at runtime by GeoDataService
    : territories.all.map(t => t.code)
  const territoryModes = createTerritoryModes(
    jsonConfig,
    territories.mainland.code,
    isSingleFocusPattern,
    locale,
    allTerritoryCodes,
  )
  const territoryGroups = createTerritoryGroups(jsonConfig, locale)

  // Create geo data config
  const geoDataConfig = createGeoDataConfig(jsonConfig, territories)

  // Create atlas config
  const atlasConfig = createAtlasConfig(
    jsonConfig,
    territories,
    geoDataConfig,
    territoryModes,
    locale,
  )

  // Extract projection preferences if provided
  const projectionPreferences: ProjectionPreferences | undefined = jsonConfig.projectionPreferences

  // Store raw i18n values for reactive translation
  const rawModeLabels = Object.fromEntries(
    (jsonConfig.modes || []).map(mode => [mode.id, mode.label]),
  )
  const rawGroupLabels = Object.fromEntries(
    (jsonConfig.groups || []).map(group => [group.id.toUpperCase(), group.label]),
  )

  // Create atlas-specific config
  const atlasSpecificConfig: AtlasSpecificConfig = {
    projectionParams,
    territoryModes,
    territoryGroups,
    projectionPreferences,
    rawModeLabels,
    rawGroupLabels: Object.keys(rawGroupLabels).length > 0 ? rawGroupLabels : undefined,
  }

  return {
    atlasConfig,
    atlasSpecificConfig,
    territories,
  }
}
