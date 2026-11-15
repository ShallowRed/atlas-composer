/**
 * Prepares the datasets used by the /examples gallery.
 *
 * Downloads official open data, joins statistics onto the boundaries, and
 * writes self-contained TopoJSON files to src/public/examples/. Each entity
 * carries `code`, `name`, `group` (region, NUTS 2) and its value.
 * Outputs are committed to the repository so the app builds without network
 * access; re-run this script to refresh them.
 *
 * Sources:
 * - France boundaries: Etalab, contours administratifs 2024 (Licence Ouverte 2.0)
 * - France population: INSEE, populations de référence 2022 (fichier ensemble)
 *   Mayotte is absent from that file (separate census cycle); INSEE estimates
 *   its population at 300,000 on 2022-01-01 (Insee, estimations de population).
 * - Portugal boundaries: Eurostat GISCO, NUTS 2024 1:3m (© EuroGeographics)
 * - Portugal density: Eurostat, demo_r_d3dens (population density by NUTS3)
 */

import type { Objects, Topology } from 'topojson-specification'
import { Buffer } from 'node:buffer'
import { execSync } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import process from 'node:process'
import { geoArea } from 'd3-geo'
import { topology } from 'topojson-server'
import { quantize } from 'topojson-client'
import { presimplify, quantile, simplify } from 'topojson-simplify'
import { logger } from '#scripts/utils/logger'

interface Feature {
  type: 'Feature'
  geometry: { type: string, coordinates: unknown }
  properties: Record<string, unknown>
}

interface FeatureCollection {
  type: 'FeatureCollection'
  features: Feature[]
}

const OUTPUT_DIR = path.join(process.cwd(), 'src/public', 'examples')

const EARTH_RADIUS_KM = 6371
const EARTH_AREA_KM2 = 4 * Math.PI * EARTH_RADIUS_KM * EARTH_RADIUS_KM

const SOURCES = {
  franceContours: 'https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/2024/geojson/departements-100m.geojson',
  inseePopulations: 'https://www.insee.fr/fr/statistiques/fichier/8290591/ensemble.zip',
  giscoNuts3: 'https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_03M_2024_4326_LEVL_3.geojson',
  eurostatDensity: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_r_d3dens?format=JSON&geoLevel=nuts3&time=2023',
}

/**
 * INSEE estimate on 2022-01-01; Mayotte is not in the "populations de
 * référence 2022" file because its census follows a separate cycle.
 * https://www.insee.fr/fr/statistiques/serie/001760180
 */
const MAYOTTE_POPULATION_2022 = 300000

/** Departments covered by the france-standard composite preset (métropole + 5 DROM). */
const FRANCE_DEPARTMENT_CODES = new Set([
  ...Array.from({ length: 95 }, (_, i) => String(i + 1).padStart(2, '0')).filter(c => c !== '20'),
  '2A',
  '2B',
  '971',
  '972',
  '973',
  '974',
  '976',
])

async function download(url: string): Promise<Buffer> {
  logger.info(`Downloading ${url}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

function featureAreaKm2(feature: Feature): number {
  return geoArea(feature as any) / (4 * Math.PI) * EARTH_AREA_KM2
}

function parseCsv(text: string, separator: string): string[][] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.split(separator))
}

// The simplification keeps a border shared by two entities identical for both; keptPoints is the share of points it keeps
function toTopology(features: Feature[], keptPoints: number): Topology {
  // topojson-server types the properties as nullable, which the constraint of topojson-simplify excludes
  const built = topology({ entities: { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection }, 1e5) as Topology<Objects>
  const entities = presimplify(built)
  return quantize(simplify(entities, quantile(entities, keptPoints)), 1e5)
}

async function prepareFrance(): Promise<void> {
  logger.section('France: population density by département')

  const contours = JSON.parse((await download(SOURCES.franceContours)).toString()) as FeatureCollection

  const zipBuffer = await download(SOURCES.inseePopulations)
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'insee-'))
  const zipPath = path.join(tempDir, 'ensemble.zip')
  await fs.writeFile(zipPath, zipBuffer)
  execSync(`unzip -o -q ${JSON.stringify(zipPath)} -d ${JSON.stringify(tempDir)}`)
  const csvText = await fs.readFile(path.join(tempDir, 'donnees_departements.csv'), 'utf-8')

  const populationByCode = new Map<string, number>()
  const rows = parseCsv(csvText, ';')
  const header = rows[0]!
  const depIndex = header.indexOf('DEP')
  const pmunIndex = header.indexOf('PMUN')
  for (const row of rows.slice(1)) {
    populationByCode.set(row[depIndex]!, Number(row[pmunIndex]))
  }
  populationByCode.set('976', MAYOTTE_POPULATION_2022)

  const features = contours.features
    .filter(f => FRANCE_DEPARTMENT_CODES.has(f.properties.code as string))
    .map((f) => {
      const code = f.properties.code as string
      const population = populationByCode.get(code)
      if (population === undefined) {
        throw new Error(`No INSEE population for département ${code}`)
      }
      const areaKm2 = featureAreaKm2(f as any)
      return {
        type: 'Feature' as const,
        geometry: f.geometry,
        properties: {
          code,
          name: f.properties.nom,
          group: f.properties.region,
          population,
          density: Math.round(population / areaKm2 * 10) / 10,
        },
      }
    })

  if (features.length !== FRANCE_DEPARTMENT_CODES.size) {
    throw new Error(`Expected ${FRANCE_DEPARTMENT_CODES.size} départements, got ${features.length}`)
  }

  const outputPath = path.join(OUTPUT_DIR, 'france-departements.json')
  await fs.writeFile(outputPath, JSON.stringify(toTopology(features, 0.08)))
  logger.success(`Wrote ${features.length} départements to ${outputPath}`)
}

async function preparePortugal(): Promise<void> {
  logger.section('Portugal: population density by NUTS3 region')

  const nuts3 = JSON.parse((await download(SOURCES.giscoNuts3)).toString()) as FeatureCollection
  const eurostat = JSON.parse((await download(SOURCES.eurostatDensity)).toString())

  const geoIndex = eurostat.dimension.geo.category.index as Record<string, number>
  const values = eurostat.value as Record<string, number>
  const densityByNuts = new Map<string, number>()
  for (const [nutsId, index] of Object.entries(geoIndex)) {
    const value = values[String(index)]
    if (value !== undefined) {
      densityByNuts.set(nutsId, value)
    }
  }

  const features = nuts3.features
    .filter(f => f.properties.CNTR_CODE === 'PT')
    .map((f) => {
      const code = f.properties.NUTS_ID as string
      const density = densityByNuts.get(code)
      if (density === undefined) {
        throw new Error(`No Eurostat density for NUTS3 ${code}`)
      }
      return {
        type: 'Feature' as const,
        geometry: f.geometry,
        properties: {
          code,
          name: f.properties.NAME_LATN as string,
          group: code.slice(0, 4),
          density,
        },
      }
    })

  const outputPath = path.join(OUTPUT_DIR, 'portugal-nuts3.json')
  await fs.writeFile(outputPath, JSON.stringify(toTopology(features, 0.6)))
  logger.success(`Wrote ${features.length} NUTS3 regions to ${outputPath}`)
}

async function main(): Promise<void> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  await prepareFrance()
  await preparePortugal()
  logger.success('All example datasets prepared')
}

main().catch((error) => {
  logger.error(String(error))
  process.exit(1)
})
