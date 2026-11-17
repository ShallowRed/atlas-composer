import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { prepareAtlasData, toTopology } from '#scripts/geodata/prepare'
import { getResolution, parseArgs, showHelp, validateRequired } from '#scripts/utils/cli-args'
import { logger } from '#scripts/utils/logger'
import { DEFAULT_RESOLUTION, readWorldData } from '#scripts/utils/ne-data'
import { RULES_RESOLUTION } from '../packages/preset-library/src/territories.js'

const OUTPUT_DIR = path.join(process.cwd(), 'src/public', 'data')

const OUTPUT_FILENAMES = {
  territories: (configName: string, resolution: string) => `${configName}-territories-${resolution}.json`,
  metadata: (configName: string, resolution: string) => `${configName}-metadata-${resolution}.json`,
}

async function saveData(filename: string, data: any): Promise<void> {
  const outputPath = path.join(OUTPUT_DIR, filename)
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  await fs.writeFile(outputPath, JSON.stringify(data))
  logger.success(`Saved ${filename}`)
}

async function main(): Promise<void> {
  try {
    const args = parseArgs()

    if (args.help) {
      showHelp(
        'prepare-geodata',
        'Reads the Natural Earth topology of world-atlas and writes the territories of an atlas as a topology',
        'npm run geodata:prepare <atlas> [--resolution=10m|50m|110m]',
        {
          '<atlas>': 'Atlas name (portugal, france, europe)',
          '--resolution=<val>': `Natural Earth resolution (10m, 50m, 110m) [default: ${DEFAULT_RESOLUTION}]`,
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
    logger.data('Resolution', resolution)
    logger.newline()

    logger.subsection('Step 1: Read world data')
    const worldData = await readWorldData(resolution)
    const ruleTopology = resolution === RULES_RESOLUTION ? undefined : await readWorldData(RULES_RESOLUTION)

    logger.subsection('Step 2: Filter territories and create metadata')
    const prepared = await prepareAtlasData(atlasName, worldData, { resolution, created: new Date().toISOString(), ruleTopology })
    await saveData(OUTPUT_FILENAMES.territories(prepared.outputName, resolution), toTopology(prepared.territories))
    await saveData(OUTPUT_FILENAMES.metadata(prepared.outputName, resolution), prepared.metadata)

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
