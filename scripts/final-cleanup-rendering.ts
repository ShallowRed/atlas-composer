#!/usr/bin/env tsx

/**
 * Final Cleanup Script: Remove Deprecated Rendering Properties
 *
 * This script removes the deprecated rendering properties from atlas
 * configuration files now that the preset system is fully functional.
 *
 * Run this script ONLY after confirming that:
 * 1. All preset files are working correctly
 * 2. The application loads properly with preset-based configuration
 * 3. All atlas rendering is working as expected
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

interface AtlasConfig {
  [key: string]: any
  territories?: any[] | '*'
}

async function _main() {
  console.log('🧹 Final cleanup: Removing deprecated rendering properties')
  console.log('⚠️  This will permanently remove rendering data from atlas configs!')

  const configsDir = join(process.cwd(), 'configs')

  // Get all atlas config files
  const allFiles = readdirSync(configsDir)
  const configFiles = allFiles.filter(file =>
    file.endsWith('.json') && file !== 'schema.json',
  )

  let processedCount = 0
  let territoryCount = 0

  for (const configFile of configFiles) {
    const atlasId = configFile.replace('.json', '')
    const configPath = join(configsDir, configFile)

    console.log(`\n📁 Processing: ${atlasId}`)

    try {
      const configContent = readFileSync(configPath, 'utf-8')
      const atlasConfig: AtlasConfig = JSON.parse(configContent)

      if (!atlasConfig.territories || (typeof atlasConfig.territories === 'string' && atlasConfig.territories === '*')) {
        console.log(`   ⚠️  Skipping wildcard atlas: ${atlasId}`)
        continue
      }

      // Count territories with rendering properties
      const territoriesWithRendering = atlasConfig.territories.filter((t: any) => t.rendering)

      if (territoriesWithRendering.length === 0) {
        console.log(`   ✅ No rendering properties found`)
        continue
      }

      console.log(`   🔍 Found ${territoriesWithRendering.length} territories with rendering properties`)

      // Remove rendering properties from all territories
      let removedCount = 0
      atlasConfig.territories = atlasConfig.territories.map((territory: any) => {
        if (territory.rendering) {
          const { rendering, ...territoryWithoutRendering } = territory
          removedCount++
          territoryCount++
          return territoryWithoutRendering
        }
        return territory
      })

      if (removedCount > 0) {
        // Write cleaned configuration
        const jsonContent = JSON.stringify(atlasConfig, null, 2)
        writeFileSync(configPath, `${jsonContent}\n`)
        console.log(`   ✅ Removed rendering from ${removedCount} territories`)
        processedCount++
      }
    }
    catch (error) {
      console.error(`   ❌ Error processing ${atlasId}:`, error)
    }
  }

  console.log('\n📈 Final Cleanup Summary:')
  console.log(`   ✅ Processed configs: ${processedCount}`)
  console.log(`   🧹 Territories cleaned: ${territoryCount}`)

  if (processedCount > 0) {
    console.log('\n🎉 Cleanup completed successfully!')
    console.log('\n📋 Migration Summary:')
    console.log('   ✅ Atlas configurations cleaned of deprecated rendering properties')
    console.log('   ✅ Preset files provide all rendering configuration')
    console.log('   ✅ Single source of truth established')
    console.log('   ✅ Architecture duplication eliminated')

    console.log('\n🔄 Next Steps:')
    console.log('   1. Test the application thoroughly')
    console.log('   2. Update schema to remove rendering property completely')
    console.log('   3. Update atlas loader to remove rendering property support')
    console.log('   4. Update TerritoryConfig types to remove rendering-related fields')
  }
  else {
    console.log('\n✨ All configurations were already clean!')
  }
}

// Show confirmation prompt
console.log('⚠️  WARNING: This will permanently remove rendering properties from atlas configs!')
console.log('📋 Make sure you have:')
console.log('   ✅ Tested that preset files work correctly')
console.log('   ✅ Verified that the application loads properly')
console.log('   ✅ Confirmed all atlas rendering works as expected')
console.log('\n🔄 Recommended workflow:')
console.log('   1. Test the app with current setup first')
console.log('   2. Only run this script when confident presets work perfectly')
console.log('   3. Create a backup of configs/ directory before running')

// Uncomment the line below when ready to run the cleanup
// _main().catch(console.error)

console.log('\n💡 To run this cleanup, uncomment the last line in the script.')
