import type { I18nValue, JSONAtlasConfig, JSONTerritoryConfig } from '#types'
import type {
  AtlasConfig,
  GeoDataConfig,
  TerritoryCollection,
  TerritoryCollections,
  TerritoryConfig,
} from '@/types'
import type { TerritoryCode } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'
import type { AtlasRegistryBehavior } from '@/types/registry'
import { getCurrentLocale, resolveI18nValue } from '@/core/atlases/i18n-utils'

function getFallbackProjectionParameters(atlasId: string): ProjectionParameters {
  const baseParams: ProjectionParameters = {
    center: [0, 0],
    rotate: [0, 0],
    parallels: [30, 60],
  }

  switch (atlasId) {
    case 'world':
      return { ...baseParams, center: [0, 20] }
    case 'france':
      return { ...baseParams, center: [2, 46] }
    case 'spain':
      return { ...baseParams, center: [-3, 40] }
    case 'portugal':
      return { ...baseParams, center: [-8, 39] }
    case 'usa':
      return { ...baseParams, center: [-96, 40] }
    default:
      return baseParams
  }
}

function getFallbackProjectionPreferences(atlasId: string): ProjectionPreferences | undefined {
  switch (atlasId) {
    case 'world':
      return { recommended: ['natural-earth', 'robinson'] }
    case 'france':
      return { recommended: ['conic-conformal-france'] }
    case 'spain':
      return { recommended: ['conic-conformal-spain'] }
    case 'portugal':
      return { recommended: ['conic-conformal-portugal'] }
    case 'usa':
      return { recommended: ['albers-usa', 'albers-usa-composite'] }
    case 'europe':
      return { recommended: ['conic-conformal-europe'] }
    default:
      return { recommended: [`conic-conformal-${atlasId}`] }
  }
}

export interface ProjectionPreferences {
  exclude?: string[]
  categoryOrder?: string[]
  recommended?: string[]
  prohibited?: string[]
}

export interface AtlasSpecificConfig {
  projectionParams: ProjectionParameters
  territoryModes: Record<string, TerritoryCollection>
  territoryCollections?: TerritoryCollections
  projectionPreferences?: ProjectionPreferences
  rawModeLabels: Record<string, I18nValue>
  rawGroupLabels?: Record<string, I18nValue>
  rawCollectionLabels?: Record<string, Record<string, I18nValue>>
}

export interface LoadedTerritories {
  first: TerritoryConfig
  all: TerritoryConfig[]
  isWildcard?: boolean
}

export interface LoadedAtlasConfig {
  atlasConfig: AtlasConfig
  atlasSpecificConfig: AtlasSpecificConfig
  territories: LoadedTerritories
}

export type { CompositeProjectionDefaults } from '@/types'

function transformTerritory(territory: JSONTerritoryConfig, locale: string): TerritoryConfig {
  return {
    code: territory.code as TerritoryCode,
    name: resolveI18nValue(territory.name, locale),
    ...(territory.shortName && { shortName: resolveI18nValue(territory.shortName, locale) }),
    ...(territory.region && { region: resolveI18nValue(territory.region, locale) }),
    center: territory.center,
    bounds: territory.bounds,
  }
}

function extractTerritories(config: JSONAtlasConfig, locale: string) {
  if (config.territories === '*') {
    const placeholderTerritory: TerritoryConfig = {
      code: 'WORLD' as TerritoryCode,
      name: 'World',
      center: [0, 0],
      bounds: [[-180, -90], [180, 90]],
    }

    return {
      first: placeholderTerritory,
      all: [placeholderTerritory],
      isWildcard: true,
    }
  }

  const allTerritories = config.territories.map(t => transformTerritory(t, locale))

  if (allTerritories.length === 0) {
    throw new Error(`No territories found in ${config.id}`)
  }

  const firstTerritory = allTerritories[0]!

  return {
    first: firstTerritory,
    all: allTerritories,
  }
}

function createTerritoryCollections(
  config: JSONAtlasConfig,
  locale: string,
  allTerritoryCodes?: string[],
): TerritoryCollections | undefined {
  if (!config.territoryCollections) {
    return undefined
  }

  const result: TerritoryCollections = {}

  for (const [setKey, setConfig] of Object.entries(config.territoryCollections)) {
    const collections: TerritoryCollection[] = setConfig.collections.map((collection) => {
      let codes: string[] = []

      if (collection.territories === '*') {
        if (allTerritoryCodes) {
          codes = [...allTerritoryCodes]
          if (collection.exclude) {
            codes = codes.filter(code => !collection.exclude!.includes(code))
          }
        }
        else {
          codes = ['*']
        }
      }
      else {
        codes = collection.territories
      }

      return {
        id: collection.id,
        label: resolveI18nValue(collection.label, locale),
        codes,
        exclude: collection.exclude,
      }
    })

    result[setKey] = {
      label: resolveI18nValue(setConfig.label, locale),
      selectionType: setConfig.selectionType,
      description: setConfig.description
        ? resolveI18nValue(setConfig.description, locale)
        : undefined,
      collections,
    }
  }

  return result
}

function createGeoDataConfig(config: JSONAtlasConfig, territories: LoadedTerritories): GeoDataConfig {
  const baseUrl = import.meta.env.BASE_URL

  const dataPath = `${baseUrl}data/${config.dataSources.territories}`
  const metadataPath = `${baseUrl}data/${config.dataSources.metadata}`

  return {
    dataPath,
    metadataPath,
    topologyObjectName: territories.isWildcard ? 'countries' : 'territories',
    territories: territories.all,
    isWildcard: territories.isWildcard === true,
  }
}

function createAtlasConfig(
  config: JSONAtlasConfig,
  territories: LoadedTerritories,
  geoDataConfig: GeoDataConfig,
  territoryModes: Record<string, TerritoryCollection>,
  locale: string,
): AtlasConfig {
  return {
    id: config.id,
    name: resolveI18nValue(config.name, locale),
    category: config.category,
    geoDataConfig,
    compositeProjectionConfig: territories.isWildcard
      ? undefined
      : {
          territories: territories.all,
        },
    splitModeConfig: {
      territoriesTitle: `atlas.territories.${config.id}.territories`,
    },
    hasTerritorySelector: (config.territoryCollections && Object.keys(config.territoryCollections).length > 0 && Object.keys(territoryModes).length > 0),
    isWildcard: territories.isWildcard === true,
    territoryModeOptions: Object.keys(territoryModes).map(modeId => ({
      value: modeId,
      label: territoryModes[modeId]!.label,
      translated: true, // Labels are already translated via resolveI18nValue
    })),
  }
}

export function loadAtlasConfig(jsonConfig: JSONAtlasConfig, registryBehavior?: AtlasRegistryBehavior): LoadedAtlasConfig {
  const locale = getCurrentLocale()

  const territories = extractTerritories(jsonConfig, locale)

  const projectionParams = getFallbackProjectionParameters(jsonConfig.id)

  const allTerritoryCodes = territories.isWildcard
    ? undefined
    : territories.all.map(t => t.code)

  let collectionSetKey: string | undefined

  if (registryBehavior?.collectionSets?.territoryScope) {
    collectionSetKey = registryBehavior.collectionSets.territoryScope
    const collectionSet = jsonConfig.territoryCollections?.[collectionSetKey]
    if (!collectionSet) {
      console.warn(
        `territoryScope in atlas '${jsonConfig.id}' references non-existent collection set '${collectionSetKey}'. `
        + `Territory selector will be hidden.`,
      )
      collectionSetKey = undefined
    }
    else if (collectionSet.selectionType !== 'incremental') {
      console.warn(
        `territoryScope in atlas '${jsonConfig.id}' references collection set '${collectionSetKey}' with selectionType='${collectionSet.selectionType}', but 'incremental' is recommended`,
      )
    }
  }

  // Create territory modes from territory collections
  let territoryModes: Record<string, TerritoryCollection>
  let rawModeLabels: Record<string, I18nValue>

  if (collectionSetKey && jsonConfig.territoryCollections?.[collectionSetKey]) {
    const collectionSet = jsonConfig.territoryCollections[collectionSetKey]!
    territoryModes = Object.fromEntries(
      collectionSet.collections.map((collection) => {
        let codes: string[] = []

        if (collection.territories === '*') {
          if (allTerritoryCodes) {
            codes = [...allTerritoryCodes]
            if (collection.exclude) {
              codes = codes.filter(code => !collection.exclude!.includes(code))
            }
          }
          else {
            codes = ['*']
          }
        }
        else {
          codes = collection.territories
        }

        return [
          collection.id,
          {
            id: collection.id,
            label: resolveI18nValue(collection.label, locale),
            codes,
            exclude: collection.exclude,
          },
        ]
      }),
    )
    rawModeLabels = Object.fromEntries(
      collectionSet.collections.map(c => [c.id, c.label]),
    )
  }
  else {
    if (jsonConfig.territoryCollections && Object.keys(jsonConfig.territoryCollections).length > 0) {
      console.warn(
        `No valid territory collection set found for atlas '${jsonConfig.id}'. `
        + `Registry specifies '${collectionSetKey}' but it doesn't exist. `
        + `Territory selector will be hidden. Available collection sets: ${Object.keys(jsonConfig.territoryCollections).join(', ')}`,
      )
    }
    territoryModes = {}
    rawModeLabels = {}
  }

  let territoryCollections: TerritoryCollections | undefined
  let rawCollectionLabels: Record<string, Record<string, I18nValue>> | undefined

  if (jsonConfig.territoryCollections) {
    territoryCollections = createTerritoryCollections(jsonConfig, locale, allTerritoryCodes)

    rawCollectionLabels = {}
    for (const [setKey, setConfig] of Object.entries(jsonConfig.territoryCollections)) {
      rawCollectionLabels[setKey] = Object.fromEntries(
        setConfig.collections.map(c => [c.id, c.label]),
      )
    }
  }

  const geoDataConfig = createGeoDataConfig(jsonConfig, territories)

  const atlasConfig = createAtlasConfig(
    jsonConfig,
    territories,
    geoDataConfig,
    territoryModes,
    locale,
  )

  const projectionPreferences = getFallbackProjectionPreferences(jsonConfig.id)

  const rawGroupLabels: Record<string, I18nValue> = {}

  const atlasSpecificConfig: AtlasSpecificConfig = {
    projectionParams,
    territoryModes,
    territoryCollections,
    projectionPreferences,
    rawModeLabels,
    rawGroupLabels: Object.keys(rawGroupLabels).length > 0 ? rawGroupLabels : undefined,
    rawCollectionLabels,
  }

  return {
    atlasConfig,
    atlasSpecificConfig,
    territories,
  }
}
