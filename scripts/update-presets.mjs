#!/usr/bin/env node

/**
 * Update Preset Files Script
 * 
 * Updates all preset files to conform to the new schema:
 * 1. Move translateOffset from layout to parameters
 * 2. Add missing parameters: translate, clipAngle, precision
 * 3. Provide appropriate defaults based on projection family
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const PRESETS_DIR = path.join(__dirname, '../configs/presets')
const BACKUP_DIR = path.join(PRESETS_DIR, 'backup')

// Parameter defaults by projection family
const PARAMETER_DEFAULTS = {
  translate: [0, 0],
  clipAngle: {
    AZIMUTHAL: 90,
    CONIC: null,
    CYLINDRICAL: null,
    PSEUDOCYLINDRICAL: null,
    POLYHEDRAL: null,
    COMPOSITE: null,
    OTHER: null
  },
  precision: 0.1
}

/**
 * Update a single preset file
 */
function updatePresetFile(filePath) {
  console.log(`Processing ${path.basename(filePath)}...`)
  
  try {
    // Read and parse the preset
    const content = fs.readFileSync(filePath, 'utf8')
    const preset = JSON.parse(content)
    
    // Skip if not a valid preset (e.g., schema.json, README.md)
    if (!preset.territories || !Array.isArray(preset.territories)) {
      console.log(`  Skipping - not a preset file`)
      return false
    }
    
    let modified = false
    
    // Update each territory
    preset.territories.forEach((territory) => {
      console.log(`  Updating territory ${territory.code}...`)
      
      // 1. Move translateOffset from layout to parameters
      if (territory.layout && territory.layout.translateOffset) {
        if (!territory.parameters.translateOffset) {
          territory.parameters.translateOffset = territory.layout.translateOffset
          modified = true
          console.log(`    Moved translateOffset to parameters`)
        }
        // Keep in layout for now to avoid breaking existing code during transition
      }
      
      // 2. Add missing translate parameter
      if (!territory.parameters.translate) {
        territory.parameters.translate = [...PARAMETER_DEFAULTS.translate]
        modified = true
        console.log(`    Added translate parameter`)
      }
      
      // 3. Add missing clipAngle parameter (based on projection family)
      if (!territory.parameters.clipAngle) {
        const family = territory.projectionFamily || 'OTHER'
        const clipAngleDefault = PARAMETER_DEFAULTS.clipAngle[family]
        territory.parameters.clipAngle = clipAngleDefault
        modified = true
        console.log(`    Added clipAngle parameter (${clipAngleDefault}) for ${family}`)
      }
      
      // 4. Add missing precision parameter
      if (!territory.parameters.precision) {
        territory.parameters.precision = PARAMETER_DEFAULTS.precision
        modified = true
        console.log(`    Added precision parameter`)
      }
      
      // 5. Ensure required parameters exist with fallbacks
      if (!territory.parameters.center) {
        territory.parameters.center = [0, 0]
        modified = true
        console.log(`    Added missing center parameter`)
      }
      
      if (!territory.parameters.rotate) {
        territory.parameters.rotate = [0, 0, 0]
        modified = true
        console.log(`    Added missing rotate parameter`)
      }
      
      if (!territory.parameters.parallels) {
        territory.parameters.parallels = [30, 60]
        modified = true
        console.log(`    Added missing parallels parameter`)
      }
    })
    
    if (modified) {
      // Write the updated preset
      fs.writeFileSync(filePath, `${JSON.stringify(preset, null, 2)}\n`)
      console.log(`  ✅ Updated ${path.basename(filePath)}`)
      return true
    } else {
      console.log(`  ⏭️  No changes needed for ${path.basename(filePath)}`)
      return false
    }
    
  } catch (error) {
    console.error(`  ❌ Error processing ${path.basename(filePath)}:`, error.message)
    return false
  }
}

/**
 * Main script execution
 */
function main() {
  console.log('🔄 Updating preset files to new schema...\n')
  
  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
    console.log(`📁 Created backup directory: ${BACKUP_DIR}\n`)
  }
  
  // Get all JSON files in presets directory (except schema.json)
  const files = fs.readdirSync(PRESETS_DIR)
    .filter(file => file.endsWith('.json') && file !== 'schema.json')
    .map(file => path.join(PRESETS_DIR, file))
  
  console.log(`📋 Found ${files.length} preset files to process\n`)
  
  let updatedCount = 0
  
  // Process each file
  files.forEach(filePath => {
    // Create backup first
    const fileName = path.basename(filePath)
    const backupPath = path.join(BACKUP_DIR, `${fileName}.bak`)
    fs.copyFileSync(filePath, backupPath)
    
    // Update the file
    const wasUpdated = updatePresetFile(filePath)
    if (wasUpdated) {
      updatedCount++
    }
    
    console.log('') // Empty line for readability
  })
  
  console.log(`✅ Preset update complete!`)
  console.log(`   Updated: ${updatedCount}/${files.length} files`)
  console.log(`   Backups: ${BACKUP_DIR}`)
  
  if (updatedCount > 0) {
    console.log(`\n⚠️  Note: translateOffset is now in both 'parameters' and 'layout' sections`)
    console.log(`   This allows gradual transition. Remove from 'layout' after code is updated.`)
  }
}

// Run the script
main()