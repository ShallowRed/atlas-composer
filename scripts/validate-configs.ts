import type { BackendConfig } from '#types'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { listConfigs, loadConfig } from '#scripts/config/loader'
import { logger } from '#scripts/utils/logger'

interface ValidationResults {
  errors: string[]
  warnings: string[]
  info: string[]
}

interface ValidationSummary extends ValidationResults {
  atlas: string
  success: boolean
  hasWarnings: boolean
}

interface GeoJSONFeature {
  type: 'Feature'
  id: string
  properties: {
    code?: string
    [key: string]: any
  }
  geometry: any
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

interface TopoJSONData {
  type: string
  objects?: {
    territories?: {
      geometries?: Array<{ id: string }>
    }
  }
}

type GeneratedData = GeoJSONFeatureCollection | TopoJSONData

async function loadBackendConfig(atlas: string): Promise<BackendConfig | null> {
  try {
    const { backend } = await loadConfig(atlas)
    return backend
  }
  catch {
    return null
  }
}

async function loadGeneratedData(atlas: string, resolution: string): Promise<GeneratedData | null> {
  try {
    const dataPath = resolve(process.cwd(), `src/public/data/${atlas}-territories-${resolution}.json`)
    const content = await readFile(dataPath, 'utf-8')
    return JSON.parse(content) as GeneratedData
  }
  catch {
    return null
  }
}
async function findAvailableResolutions(atlas: string): Promise<string[]> {
  const resolutions = ['10m', '50m', '110m']
  const available: string[] = []

  for (const resolution of resolutions) {
    const data = await loadGeneratedData(atlas, resolution)
    if (data) {
      available.push(resolution)
    }
  }

  return available
}

function extractBackendCodes(config: BackendConfig): string[] {
  return Object.values(config.territories).map(t => t.code)
}

function extractDataCodes(data: GeneratedData): string[] {
  if ('features' in data && data.type === 'FeatureCollection') {
    return data.features
      .map(f => f.properties?.code)
      .filter((code): code is string => typeof code === 'string')
  }
  else if (data.objects?.territories?.geometries) {
    return data.objects.territories.geometries.map(g => g.id)
  }
  return []
}

async function validateAtlas(atlas: string): Promise<ValidationSummary> {
  logger.section(`Validating: ${atlas}`)

  const results: ValidationResults = {
    errors: [],
    warnings: [],
    info: [],
  }

  const backendConfig = await loadBackendConfig(atlas)
  if (!backendConfig) {
    results.errors.push(`Atlas config not found in registry`)
  }
  else {
    const territoryCount = Object.keys(backendConfig.territories).length
    const isWildcard = territoryCount === 0
    if (isWildcard) {
      results.info.push(`Atlas config found: wildcard atlas (territories loaded dynamically)`)
    }
    else {
      results.info.push(`Atlas config found: ${territoryCount} territory definitions`)
    }
  }

  const availableResolutions = await findAvailableResolutions(atlas)
  if (availableResolutions.length === 0) {
    results.warnings.push(`No generated data found for any resolution (run: pnpm geodata:prepare ${atlas})`)
  }
  else {
    results.info.push(`Available resolutions: ${availableResolutions.join(', ')}`)

    for (const resolution of availableResolutions) {
      const generatedData = await loadGeneratedData(atlas, resolution)
      if (generatedData) {
        const dataFormat = generatedData.type
        let featureCount = 0
        if (dataFormat === 'FeatureCollection' && 'features' in generatedData) {
          featureCount = generatedData.features.length
        }
        else if ('objects' in generatedData && generatedData.objects?.territories?.geometries) {
          featureCount = generatedData.objects.territories.geometries.length
        }
        results.info.push(`  ${resolution}: ${dataFormat} with ${featureCount} features`)

        if (backendConfig && Object.keys(backendConfig.territories).length > 0) {
          const backendCodes = extractBackendCodes(backendConfig)
          const dataCodes = extractDataCodes(generatedData)

          const missingInData = backendCodes.filter(code => !dataCodes.includes(code))
          if (missingInData.length > 0) {
            results.errors.push(`  ${resolution}: Territories in atlas config but not in data: ${missingInData.join(', ')}`)
          }

          const orphanedInData = dataCodes.filter(code => !backendCodes.includes(code))
          if (orphanedInData.length > 0) {
            results.warnings.push(`  ${resolution}: Territories in data but not in atlas config: ${orphanedInData.join(', ')}`)
          }

          if (missingInData.length === 0 && orphanedInData.length === 0) {
            results.info.push(`  ${resolution}: ✓ Atlas config and data are in sync (${backendCodes.length} territories)`)
          }
        }
        else if (backendConfig) {
          const dataCodes = extractDataCodes(generatedData)
          results.info.push(`  ${resolution}: ✓ Wildcard atlas with ${dataCodes.length} territories loaded`)
        }
      }
    }
  }

  results.info.forEach((msg) => {
    logger.success(msg)
  })

  results.warnings.forEach((msg) => {
    logger.warning(msg)
  })

  results.errors.forEach((msg) => {
    logger.error(msg)
  })

  logger.newline()

  return {
    atlas,
    success: results.errors.length === 0,
    hasWarnings: results.warnings.length > 0,
    ...results,
  }
}

async function listAvailableAtlases(): Promise<string[]> {
  return await listConfigs()
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help') {
    logger.log('Usage: pnpm geodata:validate <atlas|--all>')
    logger.log('\nExamples:')
    logger.log('  pnpm geodata:validate portugal')
    logger.log('  pnpm geodata:validate france')
    logger.log('  pnpm geodata:validate --all')
    return
  }

  if (args[0] === '--all') {
    const atlases = await listAvailableAtlases()
    logger.section(`Validating all atlases (${atlases.length})`)
    logger.newline()

    const results: ValidationSummary[] = []
    for (const atlas of atlases) {
      const result = await validateAtlas(atlas)
      results.push(result)
    }

    logger.section('Summary')
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    const warnings = results.filter(r => r.hasWarnings)

    logger.success(`${successful.length} valid`)
    if (warnings.length > 0) {
      logger.warning(`${warnings.length} with warnings`)
    }
    if (failed.length > 0) {
      logger.error(`${failed.length} with errors`)
      failed.forEach((r) => {
        logger.log(`  - ${r.atlas}`)
      })
    }
  }
  else {
    const atlas = args[0]
    if (atlas) {
      await validateAtlas(atlas)
    }
  }
}

main().catch((error: Error) => {
  logger.error(`${error.message}`)
  if (process.env.DEBUG) {
    console.error(error)
  }
  process.exit(1)
})
