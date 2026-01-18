import type { BackendConfig, BackendTerritory } from '#scripts/config/adapter'
import type { Topology } from 'topojson-specification'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { loadConfig } from '#scripts/config/loader'
import { getResolution, parseArgs, showHelp, validateRequired } from '#scripts/utils/cli-args'
import { logger } from '#scripts/utils/logger'
import { fetchWorldData } from '#scripts/utils/ne-data'
import * as topojson from 'topojson-client'

interface GeoJSONFeature {
  type: 'Feature'
  id?: string | number
  properties?: Record<string, any>
  geometry: any
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

interface ExtractedTerritory {
  id: string
  name: string
  code: string
  iso: string
  polygons: any[]
}

interface ExtractionResult {
  remaining: GeoJSONFeature
  extracted: GeoJSONFeature[]
}

interface Metadata {
  name: string
  description: string
  source: string
  sourceUrl: string
  resolution: string
  created: string
  territories: Record<string, BackendTerritory>
  count: number
}

const OUTPUT_DIR = path.join(process.cwd(), 'src/public', 'data')

const OUTPUT_FILENAMES = {
  world: (resolution: string) => `world-countries-${resolution}.json`,
  territories: (configName: string, resolution: string) => `${configName}-territories-${resolution}.json`,
  metadata: (configName: string, resolution: string) => `${configName}-metadata-${resolution}.json`,
}

async function saveData(filename: string, data: any): Promise<void> {
  const outputPath = path.join(OUTPUT_DIR, filename)
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  await fs.writeFile(outputPath, JSON.stringify(data))
  logger.success(`Saved ${filename}`)
}

function extractEmbeddedTerritories(
  sourceFeature: GeoJSONFeature,
  config: Record<string, BackendTerritory>,
): ExtractionResult {
  if (!sourceFeature.geometry || sourceFeature.geometry.type !== 'MultiPolygon') {
    return {
      remaining: sourceFeature,
      extracted: [],
    }
  }

  const extracted: GeoJSONFeature[] = []
  const remainingPolygons: any[] = []

  const extractionRules = Object.entries(config)
    .filter(([_, terr]) => terr.extractFrom && String(terr.extractFrom) === String(sourceFeature.id || sourceFeature.properties?.id))
    .map(([id, terr]) => ({ id, ...terr }))

  if (extractionRules.length === 0) {
    return {
      remaining: sourceFeature,
      extracted: [],
    }
  }

  const extractedGroups = new Map<string, ExtractedTerritory>()

  const indicesBasedRules = extractionRules.filter(rule => rule.polygonIndices && rule.polygonIndices.length > 0)
  const boundsBasedRules = extractionRules.filter(rule => rule.bounds && !rule.polygonIndices)

  const extractedIndices = new Set<number>()
  for (const rule of indicesBasedRules) {
    if (!rule.polygonIndices)
      continue

    if (!extractedGroups.has(rule.id)) {
      extractedGroups.set(rule.id, {
        id: rule.id,
        name: rule.name,
        code: rule.code,
        iso: rule.iso,
        polygons: [],
      })
    }

    for (const index of rule.polygonIndices) {
      if (index >= 0 && index < sourceFeature.geometry.coordinates.length) {
        extractedGroups.get(rule.id)!.polygons.push(sourceFeature.geometry.coordinates[index])
        extractedIndices.add(index)
      }
      else {
        logger.warning(`  Polygon index ${index} out of range for ${rule.code} (total: ${sourceFeature.geometry.coordinates.length})`)
      }
    }
  }

  sourceFeature.geometry.coordinates.forEach((polygon: any, index: number) => {
    if (extractedIndices.has(index)) {
      return
    }

    const firstRing = polygon[0]
    if (!firstRing || firstRing.length === 0)
      return

    const lons = firstRing.map((coord: number[]) => coord[0])
    const lats = firstRing.map((coord: number[]) => coord[1])
    const minLon = Math.min(...lons)
    const maxLon = Math.max(...lons)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)

    let matched = false
    const tolerance = 0.1

    for (const rule of boundsBasedRules) {
      if (!rule.bounds)
        continue

      const [[configMinLon, configMinLat], [configMaxLon, configMaxLat]] = rule.bounds

      if (
        minLon >= (configMinLon - tolerance)
        && maxLon <= (configMaxLon + tolerance)
        && minLat >= (configMinLat - tolerance)
        && maxLat <= (configMaxLat + tolerance)
      ) {
        if (!extractedGroups.has(rule.id)) {
          extractedGroups.set(rule.id, {
            id: rule.id,
            name: rule.name,
            code: rule.code,
            iso: rule.iso,
            polygons: [],
          })
        }
        extractedGroups.get(rule.id)!.polygons.push(polygon)
        matched = true
        break
      }
    }

    if (!matched) {
      remainingPolygons.push(polygon)
    }
  })

  for (const group of extractedGroups.values()) {
    extracted.push({
      type: 'Feature',
      id: group.id,
      properties: {
        name: group.name,
        code: group.code,
        iso: group.iso,
        id: group.id,
      },
      geometry: {
        type: 'MultiPolygon',
        coordinates: group.polygons,
      },
    })
  }

  return {
    remaining: {
      ...sourceFeature,
      geometry: {
        ...sourceFeature.geometry,
        coordinates: remainingPolygons,
      },
    },
    extracted,
  }
}

function duplicateTerritories(
  features: GeoJSONFeature[],
  config: Record<string, BackendTerritory>,
): GeoJSONFeature[] {
  const result = [...features]

  const duplicationRules = Object.entries(config)
    .filter(([_, terr]) => terr.duplicateFrom)
    .map(([id, terr]) => ({ id, ...terr }))

  for (const rule of duplicationRules) {
    const sourceFeature = features.find(f =>
      String(f.id) === String(rule.duplicateFrom)
      || String(f.properties?.id) === String(rule.duplicateFrom)
      || f.properties?.code === rule.duplicateFrom,
    )

    if (sourceFeature) {
      result.push({
        ...sourceFeature,
        type: 'Feature',
        id: rule.id,
        properties: {
          name: rule.name,
          code: rule.code,
          iso: rule.iso,
          id: rule.id,
        },
      })
      logger.info(`  Duplicated ${rule.duplicateFrom} → ${rule.code}`)
    }
    else {
      logger.warning(`  Could not find source for duplicate ${rule.code}`)
    }
  }

  return result
}

function filterTerritories(
  worldData: Topology,
  territoriesConfig: Record<string, BackendTerritory>,
): GeoJSONFeatureCollection {
  const countriesObject = worldData.objects.countries
  if (!countriesObject) {
    throw new Error('No countries object found in world data')
  }
  const featureCollection = topojson.feature(worldData, countriesObject) as any as GeoJSONFeatureCollection

  const isWildcardAtlas = Object.keys(territoriesConfig).length === 0

  if (isWildcardAtlas) {
    const processedFeatures = featureCollection.features.map((feature): GeoJSONFeature => {
      const featureId = String(feature.id).padStart(3, '0')

      return {
        ...feature,
        id: featureId,
        properties: {
          ...feature.properties,
          id: featureId,
          code: feature.properties?.ISO_A3 || featureId,
          iso: feature.properties?.ISO_A3 || '',
          name: feature.properties?.NAME || '',
        },
      }
    })

    return {
      type: 'FeatureCollection',
      features: processedFeatures,
    }
  }

  const territoryIds = Object.keys(territoriesConfig)

  const idLookup = new Map<string, string>()
  for (const id of territoryIds) {
    const paddedId = id.padStart(3, '0')
    idLookup.set(paddedId, id)
    idLookup.set(id, id)
  }

  let processedFeatures = featureCollection.features
    .filter(feature => idLookup.has(String(feature.id)))
    .map((feature): GeoJSONFeature => {
      const featureId = String(feature.id)
      const configId = idLookup.get(featureId)!
      const territory = territoriesConfig[configId]

      if (!territory) {
        throw new Error(`Territory config not found for ID: ${configId}`)
      }

      return {
        ...feature,
        id: configId,
        properties: {
          ...feature.properties,
          name: territory.name,
          code: territory.code,
          iso: territory.iso,
          id: configId,
        },
      }
    })

  const extractionResults: GeoJSONFeature[] = []
  processedFeatures = processedFeatures.flatMap((feature) => {
    const territoryId = feature.properties!.id
    const territory = territoriesConfig[territoryId]

    if (!territory) {
      throw new Error(`Territory config not found for ID: ${territoryId}`)
    }

    const hasExtractions = Object.values(territoriesConfig).some(
      t => String(t.extractFrom) === String(territoryId),
    )

    if (hasExtractions) {
      const { remaining, extracted } = extractEmbeddedTerritories(feature, territoriesConfig)

      if (extracted.length > 0) {
        const codes = extracted.map(e => e.properties!.code).join(', ')
        logger.info(`  Extracted from ${territory.code}: ${codes}`)
        extractionResults.push(...extracted)
      }

      return remaining
    }

    return feature
  })

  processedFeatures.push(...extractionResults)

  const finalFeatures = duplicateTerritories(processedFeatures, territoriesConfig)

  logger.success(`  Total territories: ${finalFeatures.length}`)

  return {
    type: 'FeatureCollection',
    features: finalFeatures,
  }
}

function createMetadata(config: BackendConfig, resolution: string, dataSourceUrl: string): Metadata {
  return {
    name: config.name,
    description: config.description,
    source: 'Natural Earth',
    sourceUrl: dataSourceUrl,
    resolution,
    created: new Date().toISOString(),
    territories: config.territories,
    count: Object.keys(config.territories).length,
  }
}

async function main(): Promise<void> {
  try {
    const args = parseArgs()

    if (args.help) {
      showHelp(
        'prepare-geodata',
        'Downloads Natural Earth world data and filters specific territories',
        'npm run geodata:prepare <atlas> [--resolution=10m|50m|110m]',
        {
          '<atlas>': 'Atlas name (portugal, france, europe)',
          '--resolution=<val>': 'Natural Earth resolution (10m, 50m, 110m) [default: 50m]',
          '--help': 'Show this help message',
        },
      )
      return
    }

    if (!validateRequired(args, ['atlas'])) {
      logger.error('Usage: npm run geodata:prepare <atlas> [--resolution=10m|50m|110m]')
      process.exit(1)
    }

    const atlasName = args.atlas!
    const resolution = getResolution(args)

    logger.section(`Preparing geodata: ${atlasName}`)
    const { backend: CONFIG } = await loadConfig(atlasName)

    const isWildcard = Object.keys(CONFIG.territories).length === 0
    const territoryCount = isWildcard ? 'all (wildcard)' : Object.keys(CONFIG.territories).length

    logger.data('Description', CONFIG.description)
    logger.data('Resolution', resolution)
    logger.data('Territories', territoryCount)
    logger.newline()

    logger.subsection('Step 1: Download world data')
    const worldData = await fetchWorldData(resolution as any)
    const worldFilename = OUTPUT_FILENAMES.world(resolution)
    await saveData(worldFilename, worldData)

    logger.subsection('Step 2: Filter territories')
    const territoryData = filterTerritories(worldData, CONFIG.territories)
    const territoriesFilename = OUTPUT_FILENAMES.territories(CONFIG.outputName || atlasName, resolution)
    await saveData(territoriesFilename, territoryData)

    logger.subsection('Step 3: Create metadata')
    const dataSourceUrl = `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-${resolution}.json`
    const metadata = createMetadata(CONFIG, resolution, dataSourceUrl)
    const metadataFilename = OUTPUT_FILENAMES.metadata(CONFIG.outputName || atlasName, resolution)
    await saveData(metadataFilename, metadata)

    logger.newline()
    logger.success('All done!')
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(message)
    if (process.env.DEBUG) {
      console.error(error)
    }
    process.exit(1)
  }
}

main()
