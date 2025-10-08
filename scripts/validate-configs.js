#!/usr/bin/env node

/**
 * Configuration Validator
 * Validates consistency between backend configs, frontend configs, and generated data
 * 
 * Usage:
 *   node validate-configs.js [country]
 *   node validate-configs.js portugal
 *   node validate-configs.js --all
 * 
 * Checks:
 *   - Backend config exists
 *   - Frontend config exists
 *   - Generated data files exist
 *   - Territory codes match between backend and frontend
 *   - All referenced territories exist in data
 *   - No orphaned territories in data
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const COLORS = {
  reset: '\x1B[0m',
  green: '\x1B[32m',
  red: '\x1B[31m',
  yellow: '\x1B[33m',
  bold: '\x1B[1m',
}

/**
 * Load backend config
 */
async function loadBackendConfig(country) {
  try {
    const configPath = path.join(__dirname, 'configs', `${country}.js`)
    const module = await import(configPath)
    return module.default
  }
  catch (error) {
    return null
  }
}

/**
 * Load generated data
 */
async function loadGeneratedData(country, resolution = '50m') {
  try {
    const dataPath = path.join(process.cwd(), 'src/public/data', `${country}-territories-${resolution}.json`)
    const content = await fs.readFile(dataPath, 'utf-8')
    return JSON.parse(content)
  }
  catch (error) {
    return null
  }
}

/**
 * Load frontend config
 */
async function loadFrontendConfig(country) {
  try {
    const configPath = path.join(process.cwd(), 'src/config/regions', `${country}.config.ts`)
    const content = await fs.readFile(configPath, 'utf-8')
    return content
  }
  catch (error) {
    return null
  }
}

/**
 * Extract territory codes from backend config
 */
function extractBackendCodes(config) {
  const codes = []
  for (const [_id, territory] of Object.entries(config.territories)) {
    if (territory.code) {
      codes.push(territory.code)
    }
  }
  return codes
}

/**
 * Extract territory codes from generated data
 */
function extractDataCodes(data) {
  if (data.type === 'FeatureCollection') {
    return data.features.map(f => f.properties.code)
  }
  // TopoJSON
  if (data.objects?.territories?.geometries) {
    return data.objects.territories.geometries.map(g => g.properties.code)
  }
  return []
}

/**
 * Extract territory codes from frontend config
 */
function extractFrontendCodes(configContent) {
  const codes = []
  // Match patterns like: code: 'FR-MET' or code: "PT-CONT"
  const codeMatches = configContent.matchAll(/code:\s*['"]([A-Z]{2}-[A-Z0-9]+)['"]/g)
  for (const match of codeMatches) {
    if (!codes.includes(match[1])) {
      codes.push(match[1])
    }
  }
  return codes
}

/**
 * Validate a country configuration
 */
async function validateCountry(country) {
  console.log(`${COLORS.bold}Validating: ${country}${COLORS.reset}\n`)

  const results = {
    errors: [],
    warnings: [],
    info: [],
  }

  // Check backend config
  const backendConfig = await loadBackendConfig(country)
  if (!backendConfig) {
    results.errors.push('Backend config not found (scripts/configs/${country}.js)')
  }
  else {
    results.info.push(`Backend config found: ${Object.keys(backendConfig.territories).length} territory definitions`)
  }

  // Check generated data
  const generatedData = await loadGeneratedData(country)
  if (!generatedData) {
    results.warnings.push(`Generated data not found (run: node scripts/prepare-geodata.js ${country})`)
  }
  else {
    const dataFormat = generatedData.type
    const featureCount = dataFormat === 'FeatureCollection'
      ? generatedData.features.length
      : generatedData.objects?.territories?.geometries?.length || 0
    results.info.push(`Generated data found: ${dataFormat} with ${featureCount} features`)
  }

  // Check frontend config
  const frontendConfig = await loadFrontendConfig(country)
  if (!frontendConfig) {
    results.warnings.push('Frontend config not found (src/config/regions/${country}.config.ts)')
  }
  else {
    results.info.push('Frontend config found')
  }

  // Cross-validation
  if (backendConfig && generatedData) {
    const backendCodes = extractBackendCodes(backendConfig)
    const dataCodes = extractDataCodes(generatedData)

    // Check if all backend codes are in data
    const missingInData = backendCodes.filter(code => !dataCodes.includes(code))
    if (missingInData.length > 0) {
      results.errors.push(`Territories in backend config but not in data: ${missingInData.join(', ')}`)
    }

    // Check if all data codes are in backend
    const orphanedInData = dataCodes.filter(code => !backendCodes.includes(code))
    if (orphanedInData.length > 0) {
      results.warnings.push(`Territories in data but not in backend config: ${orphanedInData.join(', ')}`)
    }

    if (missingInData.length === 0 && orphanedInData.length === 0) {
      results.info.push(`✓ Backend config and data are in sync (${backendCodes.length} territories)`)
    }
  }

  if (frontendConfig && generatedData) {
    const frontendCodes = extractFrontendCodes(frontendConfig)
    const dataCodes = extractDataCodes(generatedData)

    // Check if frontend references non-existent data
    const missingInData = frontendCodes.filter(code => !dataCodes.includes(code))
    if (missingInData.length > 0) {
      results.errors.push(`Territories in frontend config but not in data: ${missingInData.join(', ')}`)
    }

    if (missingInData.length === 0) {
      results.info.push(`✓ Frontend config references valid data (${frontendCodes.length} territory codes)`)
    }
  }

  // Print results
  results.info.forEach((msg) => {
    console.log(`${COLORS.green}ℹ ${msg}${COLORS.reset}`)
  })

  results.warnings.forEach((msg) => {
    console.log(`${COLORS.yellow}⚠ ${msg}${COLORS.reset}`)
  })

  results.errors.forEach((msg) => {
    console.log(`${COLORS.red}✖ ${msg}${COLORS.reset}`)
  })

  console.log()

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
async function listAvailableCountries() {
  const configsDir = path.join(__dirname, 'configs')
  const files = await fs.readdir(configsDir)
  return files
    .filter(file => file.endsWith('.js') && !file.startsWith('.') && !file.includes('README'))
    .map(file => file.replace('.js', ''))
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help') {
    console.log('Usage: node validate-configs.js [country|--all]')
    console.log('\nExamples:')
    console.log('  node validate-configs.js portugal')
    console.log('  node validate-configs.js france')
    console.log('  node validate-configs.js --all')
    return
  }

  if (args[0] === '--all') {
    const countries = await listAvailableCountries()
    console.log(`${COLORS.bold}Validating all countries (${countries.length})${COLORS.reset}\n`)

    const results = []
    for (const country of countries) {
      const result = await validateCountry(country)
      results.push(result)
    }

    // Summary
    console.log(`${COLORS.bold}Summary:${COLORS.reset}`)
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    const warnings = results.filter(r => r.hasWarnings)

    console.log(`${COLORS.green}✓ ${successful.length} valid${COLORS.reset}`)
    if (warnings.length > 0) {
      console.log(`${COLORS.yellow}⚠ ${warnings.length} with warnings${COLORS.reset}`)
    }
    if (failed.length > 0) {
      console.log(`${COLORS.red}✖ ${failed.length} with errors${COLORS.reset}`)
      failed.forEach((r) => {
        console.log(`  - ${r.country}`)
      })
    }
  }
  else {
    const country = args[0]
    await validateCountry(country)
  }
}

main().catch((error) => {
  console.error(`${COLORS.red}Error: ${error.message}${COLORS.reset}`)
  process.exit(1)
})
