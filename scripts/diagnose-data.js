#!/usr/bin/env node

/**
 * Geographic Data Diagnostic Script
 * Validates integrity of prepared TopoJSON data and metadata
 * Ensures consistency between data files for cartographic rendering
 *
 * Usage:
 *   node diagnose-data.js [config-name]
 *
 * Examples:
 *   node diagnose-data.js france
 *   node diagnose-data.js spain
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const projectRoot = process.cwd()
const dataDir = path.join(projectRoot, 'public', 'data')
const configsDir = path.join(projectRoot, 'scripts', 'configs')

// Terminal colors for diagnostic output
const colors = {
  green: '\x1B[32m',
  blue: '\x1B[34m',
  yellow: '\x1B[33m',
  red: '\x1B[31m',
  reset: '\x1B[0m',
}

/**
 * Load a territory configuration from the configs directory
 * @param {string} configName - Name of the configuration file (without .js extension)
 * @returns {Promise<object>} The configuration object
 */
async function loadConfig(configName) {
  try {
    const configPath = path.join(configsDir, `${configName}.js`)
    const configModule = await import(`file://${configPath}`)
    return configModule.default
  }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'ENOENT') {
      return null
    }
    throw error
  }
}

/**
 * List all available configurations
 * @returns {Promise<string[]>} Array of available config names
 */
async function listAvailableConfigs() {
  try {
    const files = await fs.readdir(configsDir)
    return files
      .filter(file => file.endsWith('.js') && !file.startsWith('.'))
      .map(file => file.replace('.js', ''))
  }
  catch {
    return []
  }
}

/**
 * Performs comprehensive diagnostic checks on geographic data files
 * Validates TopoJSON structure and metadata consistency
 * Ensures data integrity for cartographic application
 * @param {string} configName - Name of the configuration to diagnose
 */
async function diagnoseData(configName) {
  try {
    // Load configuration
    const config = await loadConfig(configName)

    if (!config) {
      const availableConfigs = await listAvailableConfigs()
      console.error(`${colors.red}❌ Configuration not found: ${configName}${colors.reset}`)
      if (availableConfigs.length > 0) {
        console.log(`${colors.blue}📋 Available configurations: ${availableConfigs.join(', ')}${colors.reset}`)
      }
      process.exit(1)
    }

    const outputName = config.outputName || configName

    console.log(`${colors.blue}🔍 Diagnostic des données géographiques - ${config.name}${colors.reset}\n`)

    // Load both data files for cross-validation
    const territoriesPath = path.join(dataDir, `${outputName}-territories.json`)
    const metadataPath = path.join(dataDir, `${outputName}-metadata.json`)

    // Check if files exist
    try {
      await fs.access(territoriesPath)
    }
    catch {
      console.error(`${colors.red}❌ Fichier non trouvé: ${outputName}-territories.json${colors.reset}`)
      console.log(`${colors.yellow}💡 Exécutez: node scripts/prepare-geodata.js ${configName}${colors.reset}`)
      process.exit(1)
    }

    try {
      await fs.access(metadataPath)
    }
    catch {
      console.error(`${colors.red}❌ Fichier non trouvé: ${outputName}-metadata.json${colors.reset}`)
      console.log(`${colors.yellow}💡 Exécutez: node scripts/prepare-geodata.js ${configName}${colors.reset}`)
      process.exit(1)
    }

    const territoriesData = JSON.parse(await fs.readFile(territoriesPath, 'utf-8'))
    const metadataInfo = JSON.parse(await fs.readFile(metadataPath, 'utf-8'))

    // Display metadata summary
    console.log(`${colors.blue}📋 Métadonnées:${colors.reset}`)
    console.log(`  Nom: ${metadataInfo.name}`)
    console.log(`  Description: ${metadataInfo.description}`)
    console.log(`  Source: ${metadataInfo.source}`)
    console.log(`  Résolution: ${metadataInfo.resolution}`)
    console.log(`  Créé le: ${new Date(metadataInfo.created).toLocaleString('fr-FR')}`)
    console.log(`  Territoires déclarés: ${metadataInfo.count}`)

    // Display TopoJSON structure information
    console.log(`\n${colors.blue}🗺️  Données TopoJSON:${colors.reset}`)
    console.log(`  Type: ${territoriesData.type}`)
    console.log(`  Arcs: ${territoriesData.arcs?.length || 'N/A'}`)
    console.log(`  Objet: ${Object.keys(territoriesData.objects)[0]}`)
    console.log(`  Géométries: ${territoriesData.objects.countries?.geometries?.length || 0}`)

    // Display territories details
    console.log(`\n${colors.blue}🏴 Territoires:${colors.reset}`)
    const geometries = territoriesData.objects.countries?.geometries || []
    geometries.forEach((geom, index) => {
      const territoryInfo = metadataInfo.territories[geom.id]
      if (territoryInfo) {
        console.log(`  ${index + 1}. ${territoryInfo.name} (${territoryInfo.code}) - ID: ${geom.id}`)
      }
      else {
        console.log(`  ${index + 1}. ${colors.yellow}[Territoire inconnu]${colors.reset} - ID: ${geom.id}`)
      }
    })

    // Cross-validate data consistency
    const metaCount = metadataInfo.count
    const geomCount = geometries.length
    const expectedCount = Object.keys(config.territories).length

    console.log(`\n${colors.blue}✓ Vérifications:${colors.reset}`)
    console.log(`  Configuration: ${expectedCount} territoires`)
    console.log(`  Métadonnées: ${metaCount} territoires`)
    console.log(`  Géométries: ${geomCount} features`)

    // Check if all counts match
    let hasErrors = false

    if (expectedCount !== metaCount) {
      console.log(`  ${colors.yellow}⚠️  Incohérence: config (${expectedCount}) ≠ métadonnées (${metaCount})${colors.reset}`)
      hasErrors = true
    }

    if (metaCount !== geomCount) {
      console.log(`  ${colors.yellow}⚠️  Incohérence: métadonnées (${metaCount}) ≠ géométries (${geomCount})${colors.reset}`)
      hasErrors = true
    }

    // Verify all territories in config have geometries
    const geomIds = new Set(geometries.map(g => g.id))
    const configIds = Object.keys(config.territories).map(Number)
    const missingIds = configIds.filter(id => !geomIds.has(id))

    if (missingIds.length > 0) {
      console.log(`  ${colors.red}❌ Territoires manquants:${colors.reset}`)
      missingIds.forEach((id) => {
        const territory = config.territories[id]
        console.log(`     - ${territory.name} (ID: ${id})`)
      })
      hasErrors = true
    }

    // Check for extra geometries not in config
    const extraIds = [...geomIds].filter(id => !configIds.includes(id))
    if (extraIds.length > 0) {
      console.log(`  ${colors.yellow}⚠️  Géométries supplémentaires:${colors.reset}`)
      extraIds.forEach((id) => {
        console.log(`     - ID: ${id}`)
      })
      hasErrors = true
    }

    if (!hasErrors) {
      console.log(`\n${colors.green}✅ Tous les contrôles sont OK !${colors.reset}`)
    }
    else {
      console.log(`\n${colors.yellow}⚠️  Des incohérences ont été détectées${colors.reset}`)
      console.log(`${colors.yellow}💡 Essayez de régénérer les données: node scripts/prepare-geodata.js ${configName}${colors.reset}`)
    }
  }
  catch (error) {
    console.error(`${colors.red}❌ Erreur:${colors.reset}`, error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Execute diagnostic when script is run directly
const configName = process.argv[2] || 'france'
diagnoseData(configName)
