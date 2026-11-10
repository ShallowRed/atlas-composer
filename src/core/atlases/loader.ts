import type { AtlasRegistryBehavior, JSONAtlasConfig, JSONTerritoryConfig } from '#types'
import type {
  AtlasConfig,
  GeoDataConfig,
  TerritoryCollection,
  TerritoryCollections,
  TerritoryConfig,
} from '@/types'
import type { TerritoryCode } from '@/types/branded'
import { resolveI18nValue } from '@/core/atlases/i18n-utils'

export interface AtlasSpecificConfig {
  territoryModes: Record<string, TerritoryCollection>
  territoryCollections?: TerritoryCollections
}

interface LoadedTerritories {
  all: TerritoryConfig[]
  isWildcard?: boolean
}

export interface LoadedAtlasConfig {
  atlasConfig: AtlasConfig
  atlasSpecificConfig: AtlasSpecificConfig
  territories: LoadedTerritories
}

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
      all: [placeholderTerritory],
      isWildcard: true,
    }
  }

  const allTerritories = config.territories.map(t => transformTerritory(t, locale))

  if (allTerritories.length === 0) {
    throw new Error(`No territories found in ${config.id}`)
  }

  return {
    all: allTerritories,
  }
}

function createTerritoryCollections(
  config: JSONAtlasConfig,
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
        label: collection.label,
        codes,
        exclude: collection.exclude,
      }
    })

    result[setKey] = {
      label: setConfig.label,
      selectionType: setConfig.selectionType,
      description: setConfig.description,
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
): AtlasConfig {
  return {
    id: config.id,
    name: config.name,
    category: config.category,
    geoDataConfig,
    projectionPreferences: config.projectionPreferences as AtlasConfig['projectionPreferences'],
    compositeTerritories: territories.isWildcard
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
    })),
  }
}

export function loadAtlasConfig(
  jsonConfig: JSONAtlasConfig,
  registryBehavior: AtlasRegistryBehavior | undefined,
  locale: string,
): LoadedAtlasConfig {
  const territories = extractTerritories(jsonConfig, locale)

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
            label: collection.label,
            codes,
            exclude: collection.exclude,
          },
        ]
      }),
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
  }

  let territoryCollections: TerritoryCollections | undefined

  if (jsonConfig.territoryCollections) {
    territoryCollections = createTerritoryCollections(jsonConfig, allTerritoryCodes)
  }

  const geoDataConfig = createGeoDataConfig(jsonConfig, territories)

  const atlasConfig = createAtlasConfig(
    jsonConfig,
    territories,
    geoDataConfig,
    territoryModes,
  )

  const atlasSpecificConfig: AtlasSpecificConfig = {
    territoryModes,
    territoryCollections,
  }

  return {
    atlasConfig,
    atlasSpecificConfig,
    territories,
  }
}
