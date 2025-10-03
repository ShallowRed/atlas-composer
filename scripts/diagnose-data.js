#!/usr/bin/env node

/**
 * Geographic Data Diagnostic Script
 * Validates integrity of prepared TopoJSON data and metadata
 * Ensures consistency between data files for cartographic rendering
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '../public/data')

// Terminal colors for diagnostic output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
}

/**
 * Performs comprehensive diagnostic checks on geographic data files
 * Validates TopoJSON structure and metadata consistency
 * Ensures data integrity for cartographic application
 */
async function diagnosisData() {
  try {
    console.log(`${colors.blue}Diagnostic des données géographiques${colors.reset}\n`)
    
    // Load both data files for cross-validation
    const francePath = path.join(dataDir, 'france-territories.json')
    const metaPath = path.join(dataDir, 'metadata.json')
    
    const franceData = JSON.parse(await fs.readFile(francePath, 'utf-8'))
    const metaData = JSON.parse(await fs.readFile(metaPath, 'utf-8'))
    
    // Display metadata summary
    console.log('Métadonnées:')
    console.log(`  Source: ${metaData.source} v${metaData.version}`)
    console.log(`  Territoires: ${metaData.territories.length}`)
    
    // Display TopoJSON structure information
    console.log('\nDonnées TopoJSON:')
    console.log(`  Type: ${franceData.type}`)
    console.log(`  Arcs: ${franceData.arcs?.length || 'N/A'}`)
    console.log(`  Géométries: ${franceData.objects.territories?.geometries?.length || 0}`)
    
    // Cross-validate data consistency
    const metaCount = metaData.territories.length
    const geomCount = franceData.objects.territories?.geometries?.length || 0
    
    console.log('\nVérifications:')
    console.log(`  Métadonnées: ${metaCount} territoires`)
    console.log(`  Géométries: ${geomCount} features`)
    
    // Check if metadata and geometry counts match
    if (metaCount === geomCount) {
      console.log(`  ${colors.green}Cohérence OK${colors.reset}`)
    } else {
      console.log(`  ${colors.yellow}Incohérence détectée${colors.reset}`)
    }
    
  } catch (error) {
    console.error(`${colors.red}Erreur:${colors.reset}`, error.message)
  }
}

// Execute diagnostic when script is run directly
diagnosisData()