#!/usr/bin/env node
import type { AtlasTerritoriesInput, TerritorySource } from '@atlas-composer/preset-library'
import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import process from 'node:process'
import { parseArgs } from 'node:util'
import { buildTerritories, catalog, getPreset, getPresetMetadata } from '@atlas-composer/preset-library'
import { ConfigValidationError, ProjectionLoader, validateConfig } from '@atlas-composer/projection-loader'
import { registerAllD3Projections } from '@atlas-composer/projection-loader/helpers'
import { describeComposite } from '@atlas-composer/projection-loader/neutral'
import { toRfc7946 } from './antimeridian.js'
import { composeTerritories } from './compose.js'
import { naturalEarthSource } from './natural-earth.js'

const USAGE = `Usage:
  atlas-composer territories <atlas> [--resolution 10m|50m|110m] [--data <file>]
  atlas-composer compose <preset|file.json> [--data <file>] --out <file>
  atlas-composer describe <preset|file.json>

Commands:
  territories  Writes the territories of an atlas to the standard output, as GeoJSON
  compose      Writes the territories placed in a composite projection to --out, as GeoJSON
               in longitudes and latitudes to display in EPSG:3857, and the canvas of the
               composition with the territories left out to <out>.json
  describe     Writes the PROJ pipeline and the frame of each territory of a composite
               projection to the standard output, as JSON

Options:
  --resolution <value>  Natural Earth resolution, for territories: 10m, 50m or 110m [default: 50m]
  --data <file>         GeoJSON features with the code of a territory in properties.code,
                        read in place of Natural Earth
  --out <file>          File of the composed geometries, for compose
  --help                Shows this message`

const DEFAULT_RESOLUTION = '50m'

const require = createRequire(import.meta.url)

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function readAtlas(atlasId: string): AtlasTerritoriesInput {
  if (!Object.hasOwn(catalog.atlases, atlasId)) {
    throw new Error(`Unknown atlas "${atlasId}". Atlases: ${Object.keys(catalog.atlases).join(', ')}`)
  }
  return require(`@atlas-composer/preset-library/atlases/${atlasId}`)
}

function readSource(data: string | undefined, resolution: string): TerritorySource {
  return data ? { kind: 'by-code', features: readJson(data) } : naturalEarthSource(resolution)
}

async function readComposite(command: string, target: string): Promise<CompositeProjectionConfig> {
  if (target.endsWith('.json')) {
    const config = readJson(target)
    const { valid, errors } = validateConfig(config)
    if (!valid) {
      throw new ConfigValidationError(errors)
    }
    return config
  }
  const metadata = getPresetMetadata(target)
  if (!metadata) {
    throw new Error(`Unknown preset "${target}"`)
  }
  if (metadata.type !== 'composite-custom') {
    throw new Error(`The preset "${target}" has the type "${metadata.type}": ${command} reads a composite-custom preset`)
  }
  const config = await getPreset(target)
  if (!config) {
    throw new Error(`The preset "${target}" has no file`)
  }
  return config
}

function territories(atlasId: string, options: { data?: string, out?: string, resolution: string }) {
  if (options.out) {
    throw new Error('territories writes to the standard output: redirect it to a file in place of --out')
  }
  const { collection, skippedFeatures } = buildTerritories(readAtlas(atlasId), readSource(options.data, options.resolution))
  if (skippedFeatures.length > 0) {
    console.error(`Left out, without id, geometry or name: ${skippedFeatures.join(', ')}`)
  }
  process.stdout.write(`${JSON.stringify(toRfc7946(collection))}\n`)
}

async function compose(target: string, options: { data?: string, out?: string, resolution: string }) {
  if (options.resolution !== DEFAULT_RESOLUTION) {
    throw new Error(`compose reads Natural Earth at ${DEFAULT_RESOLUTION}, the resolution of the extraction rules of the atlases`)
  }
  if (!options.out) {
    throw new Error('compose writes a file: give its path with --out')
  }
  const config = await readComposite('compose', target)
  const { collection: built } = buildTerritories(readAtlas(config.metadata.atlasId), readSource(options.data, DEFAULT_RESOLUTION))

  const loader = new ProjectionLoader()
  registerAllD3Projections(factories => loader.registerAll(factories))
  const { collection, ...composition } = composeTerritories(loader, config, built)

  writeFileSync(options.out, `${JSON.stringify(collection)}\n`)
  writeFileSync(`${options.out}.json`, `${JSON.stringify(composition, null, 2)}\n`)
}

async function describe(target: string, options: { data?: string, out?: string }) {
  if (options.data) {
    throw new Error('describe reads no geometry: remove --data')
  }
  if (options.out) {
    throw new Error('describe writes to the standard output: redirect it to a file in place of --out')
  }
  const description = describeComposite(await readComposite('describe', target))
  process.stdout.write(`${JSON.stringify(description, null, 2)}\n`)
}

async function main() {
  const { values, positionals: [command, target] } = parseArgs({
    allowPositionals: true,
    options: {
      resolution: { type: 'string', default: DEFAULT_RESOLUTION },
      data: { type: 'string' },
      out: { type: 'string' },
      help: { type: 'boolean', default: false },
    },
  })

  if (values.help) {
    console.log(USAGE)
    return
  }
  if (command === 'territories' && target) {
    territories(target, values)
    return
  }
  if (command === 'compose' && target) {
    await compose(target, values)
    return
  }
  if (command === 'describe' && target) {
    await describe(target, values)
    return
  }
  throw new Error(USAGE)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
