import type { BackendConfig } from './utils/config-adapter.js'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { listConfigs, loadConfig } from './utils/config-loader.js'
import { logger } from './utils/logger.js'

interface ValidationResults {
  errors: string[]
  warnings: string[]
  info: string[]
}

interface ValidationSummary extends ValidationResults {
  country: string
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

/**
 * Load backend config for a country
 */
async function loadBackendConfig(country: string): Promise<BackendConfig | null> {
  try {
    const { backend } = await loadConfig(country)
    return backend
  }
  catch {
    return null
  }
}

/**
 * Load generated geodata for a country
 */
async function loadGeneratedData(country: string, resolution = '50m'): Promise<GeneratedData | null> {
  try {
    const dataPath = resolve(process.cwd(), `src/public/data/${country}-territories-${resolution}.json`)
    const content = await readFile(dataPath, 'utf-8')
    return JSON.parse(content) as GeneratedData
  }
  catch {
    return null
  }
}

/**
 * Extract territory codes from backend config
 */
function extractBackendCodes(config: BackendConfig): string[] {
  return Object.values(config.territories).map(t => t.code)
}

/**
 * Extract territory codes from generated data
 */
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

/**
 * Validate a country configuration
 */
async function validateCountry(country: string): Promise<ValidationSummary> {
  logger.section(`Validating: ${country}`)

  const results: ValidationResults = {
    errors: [],
    warnings: [],
    info: [],
  }

  // Check backend config
  const backendConfig = await loadBackendConfig(country)
  if (!backendConfig) {
    results.errors.push(`Atlas config not found (configs/${country}.json)`)
  }
  else {
    results.info.push(`Atlas config found: ${Object.keys(backendConfig.territories).length} territory definitions`)
  }

  // Check generated data
  const generatedData = await loadGeneratedData(country)
  if (!generatedData) {
    results.warnings.push(`Generated data not found (run: pnpm geodata:prepare ${country})`)
  }
  else {
    const dataFormat = generatedData.type
    let featureCount = 0
    if (dataFormat === 'FeatureCollection' && 'features' in generatedData) {
      featureCount = generatedData.features.length
    }
    else if ('objects' in generatedData && generatedData.objects?.territories?.geometries) {
      featureCount = generatedData.objects.territories.geometries.length
    }
    results.info.push(`Generated data found: ${dataFormat} with ${featureCount} features`)
  }

  // Cross-validation
  if (backendConfig && generatedData) {
    const backendCodes = extractBackendCodes(backendConfig)
    const dataCodes = extractDataCodes(generatedData)

    // Check if all backend codes are in data
    const missingInData = backendCodes.filter(code => !dataCodes.includes(code))
    if (missingInData.length > 0) {
      results.errors.push(`Territories in atlas config but not in data: ${missingInData.join(', ')}`)
    }

    // Check if all data codes are in backend
    const orphanedInData = dataCodes.filter(code => !backendCodes.includes(code))
    if (orphanedInData.length > 0) {
      results.warnings.push(`Territories in data but not in atlas config: ${orphanedInData.join(', ')}`)
    }

    if (missingInData.length === 0 && orphanedInData.length === 0) {
      results.info.push(`✓ Atlas config and data are in sync (${backendCodes.length} territories)`)
    }
  }

  // Print results
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
    country,
    success: results.errors.length === 0,
    hasWarnings: results.warnings.length > 0,
    ...results,
  }
}

/**
 * List all available countries
 */
async function listAvailableCountries(): Promise<string[]> {
  return await listConfigs()
}

/**
 * Main
 */
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
    const countries = await listAvailableCountries()
    logger.section(`Validating all countries (${countries.length})`)
    logger.newline()

    const results: ValidationSummary[] = []
    for (const country of countries) {
      const result = await validateCountry(country)
      results.push(result)
    }

    // Summary
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
        logger.log(`  - ${r.country}`)
      })
    }
  }
  else {
    const country = args[0]
    if (country) {
      await validateCountry(country)
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
