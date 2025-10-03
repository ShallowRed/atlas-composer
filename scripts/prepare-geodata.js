#!/usr/bin/env node

/**
 * Geographic Data Preparation Script
 * Downloads Natural Earth world data and filters French territories (metropolitan + DOM-TOM)
 * Creates optimized TopoJSON files for cartographic visualization
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '../public/data')

// Terminal colors for pretty console output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
}

// Natural Earth data source - pre-built world atlas at 50m resolution
const NATURAL_EARTH_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'

// French territories mapping: Natural Earth ID → Territory metadata
// Includes metropolitan France and all overseas departments/territories (DOM-TOM)
const FRANCE_TERRITORIES = {
  '250': { name: 'France métropolitaine', code: 'FR-MET', iso: 'FRA' },
  '666': { name: 'Saint-Pierre-et-Miquelon', code: 'FR-PM', iso: 'SPM' },
  '876': { name: 'Wallis-et-Futuna', code: 'FR-WF', iso: 'WLF' },
  '258': { name: 'Polynésie française', code: 'FR-PF', iso: 'PYF' },
  '540': { name: 'Nouvelle-Calédonie', code: 'FR-NC', iso: 'NCL' },
  '260': { name: 'Terres australes françaises', code: 'FR-TF', iso: 'ATF' },
  '663': { name: 'Saint-Martin', code: 'FR-MF', iso: 'MAF' }
}

/**
 * Downloads geographic data from URL and saves to local file
 * @param {string} url - Source URL for the geographic data
 * @param {string} filename - Local filename to save the data
 * @returns {Promise<Object>} Parsed JSON data
 */
async function downloadData(url, filename) {
  try {
    console.log(`${colors.blue}Downloading: ${filename}${colors.reset}`)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const data = await response.json()
    const filepath = path.join(dataDir, filename)
    await fs.writeFile(filepath, JSON.stringify(data, null, 2))
    console.log(`${colors.green}Saved: ${filepath}${colors.reset}`)
    return data
  } catch (error) {
    console.error(`${colors.red}Error downloading ${filename}:${colors.reset}`, error.message)
    throw error
  }
}

/**
 * Extracts French territories from world geographic data
 * Preserves TopoJSON topology (arcs, transform) for efficient rendering
 * @param {Object} worldData - Complete Natural Earth world TopoJSON
 * @returns {Object} Filtered TopoJSON containing only French territories
 */
function filterFranceData(worldData) {
  const franceFeatures = []
  const countries = worldData.objects.countries.geometries || []
  
  // Iterate through all world countries to find French territories
  for (const country of countries) {
    const countryId = country.id?.toString()
    if (FRANCE_TERRITORIES[countryId]) {
      const territory = FRANCE_TERRITORIES[countryId]
      // Enrich country data with French territory metadata
      franceFeatures.push({
        ...country,
        properties: {
          ...country.properties,
          name: territory.name,
          code: territory.code,
          iso: territory.iso,
          id: countryId
        }
      })
    }
  }
  
  console.log(`Found ${franceFeatures.length} French territories from ${countries.length} countries`)
  
  // Create new TopoJSON with only French territories but preserve topology
  return {
    type: 'Topology',
    arcs: worldData.arcs,           // Keep original coordinate arcs
    transform: worldData.transform, // Keep quantization transform
    objects: {
      territories: {
        type: 'GeometryCollection',
        geometries: franceFeatures
      }
    }
  }
}

/**
 * Creates metadata file with territory information for the cartography app
 * @returns {Object} Metadata object with data source info and territory details
 */
function createMetadata() {
  return {
    source: 'Natural Earth',
    version: '5.1.2',
    resolution: '50m',
    projection: 'WGS84',
    territories: Object.entries(FRANCE_TERRITORIES).map(([id, info]) => ({
      id,
      iso: info.iso,
      name: info.name,
      code: info.code
    }))
  }
}

/**
 * Main execution function
 * 1. Downloads Natural Earth world data
 * 2. Filters to French territories only
 * 3. Creates optimized files for cartographic application
 */
async function main() {
  try {
    // Ensure data directory exists
    await fs.mkdir(dataDir, { recursive: true })
    
    console.log(`${colors.blue}Preparing Natural Earth geographic data${colors.reset}`)
    
    // Download and process world geographic data
    const worldCountries = await downloadData(NATURAL_EARTH_URL, 'world-countries-50m.json')
    const franceData = filterFranceData(worldCountries)
    
    // Save filtered French territories TopoJSON
    const francePath = path.join(dataDir, 'france-territories.json')
    await fs.writeFile(francePath, JSON.stringify(franceData, null, 2))
    console.log(`${colors.green}France data saved: ${francePath}${colors.reset}`)
    
    // Create and save metadata for the cartography application
    const metadata = createMetadata()
    const metadataPath = path.join(dataDir, 'metadata.json')
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
    console.log(`${colors.green}Metadata created: ${metadataPath}${colors.reset}`)
    
    console.log(`\n${colors.green}Data preparation completed!${colors.reset}`)
    console.log(`${franceData.objects.territories.geometries.length} territories prepared`)
    
  } catch (error) {
    console.error(`${colors.red}Error during preparation:${colors.reset}`, error.message)
    process.exit(1)
  }
}

// Run main function only when script is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}