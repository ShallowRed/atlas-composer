#!/usr/bin/env tsx

/**
 * Atlas Configuration Cleanup Script
 *
 * Removes projection-related metadata from atlas configuration files
 * since this data has been migrated to preset files.
 *
 * Usage: pnpm tsx scripts/cleanup-atlas-projection-metadata.ts
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

interface AtlasConfig {
  [key: string]: any
  id: string
  compositeProjections?: string[]
  defaultCompositeProjection?: string
  projectionPreferences?: any
  projection?: any
  mapDisplayDefaults?: any
}

function cleanupAtlasProjectionMetadata() {
  console.log('🧹 Cleaning up projection metadata from atlas configuration files...\n')

  // Find all atlas configuration files
  const configsDir = 'configs'
  const allFiles = readdirSync(configsDir)
  const atlasConfigFiles = allFiles
    .filter((file: string) => file.endsWith('.json') && file !== 'schema.json')
    .map((file: string) => join(configsDir, file))

  const results: Array<{ atlas: string, status: 'success' | 'skipped' | 'error', message: string, changes: string[] }> = []

  for (const atlasConfigFile of atlasConfigFiles) {
    try {
      // Read atlas configuration
      const atlasConfig: AtlasConfig = JSON.parse(readFileSync(atlasConfigFile, 'utf-8'))
      const atlasId = atlasConfig.id

      console.log(`📋 Processing atlas: ${atlasId}`)

      const changes: string[] = []
      let modified = false

      // Remove compositeProjections
      if (atlasConfig.compositeProjections) {
        delete atlasConfig.compositeProjections
        changes.push('compositeProjections')
        modified = true
      }

      // Remove defaultCompositeProjection
      if (atlasConfig.defaultCompositeProjection) {
        delete atlasConfig.defaultCompositeProjection
        changes.push('defaultCompositeProjection')
        modified = true
      }

      // Remove projectionPreferences
      if (atlasConfig.projectionPreferences) {
        delete atlasConfig.projectionPreferences
        changes.push('projectionPreferences')
        modified = true
      }

      // Remove projection parameters
      if (atlasConfig.projection) {
        delete atlasConfig.projection
        changes.push('projection')
        modified = true
      }

      // Remove mapDisplayDefaults
      if (atlasConfig.mapDisplayDefaults) {
        delete atlasConfig.mapDisplayDefaults
        changes.push('mapDisplayDefaults')
        modified = true
      }

      if (!modified) {
        console.log(`   ⚠️  No projection metadata found, skipping`)
        results.push({
          atlas: atlasId,
          status: 'skipped',
          message: 'No projection metadata found',
          changes: [],
        })
        continue
      }

      // Write cleaned atlas configuration
      writeFileSync(atlasConfigFile, `${JSON.stringify(atlasConfig, null, 2)}\n`)

      console.log(`   ✅ Removed projection metadata: ${changes.join(', ')}`)
      results.push({
        atlas: atlasId,
        status: 'success',
        message: `Removed ${changes.length} projection properties`,
        changes,
      })
    }
    catch (error) {
      console.error(`   ❌ Error processing ${atlasConfigFile}:`, error)
      results.push({
        atlas: atlasConfigFile,
        status: 'error',
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        changes: [],
      })
    }
  }

  // Print summary
  console.log('\n📊 Cleanup Summary:')
  console.log('='.repeat(50))

  const successful = results.filter(r => r.status === 'success').length
  const skipped = results.filter(r => r.status === 'skipped').length
  const errors = results.filter(r => r.status === 'error').length

  console.log(`✅ Successfully cleaned: ${successful}`)
  console.log(`⚠️  Skipped (no metadata): ${skipped}`)
  console.log(`❌ Errors: ${errors}`)

  // Show what was removed
  if (successful > 0) {
    console.log('\n🗂️ Properties removed:')
    const allChanges = results
      .filter(r => r.status === 'success')
      .flatMap(r => r.changes)

    const changeCounts = allChanges.reduce((acc, change) => {
      acc[change] = (acc[change] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    Object.entries(changeCounts).forEach(([property, count]) => {
      console.log(`   ${property}: ${count} atlas(es)`)
    })
  }

  if (errors > 0) {
    console.log('\n❌ Error Details:')
    results
      .filter(r => r.status === 'error')
      .forEach(r => console.log(`   ${r.atlas}: ${r.message}`))
  }

  console.log('\n🎉 Atlas configuration cleanup completed!')

  if (successful > 0) {
    console.log('\n📝 Next steps:')
    console.log('1. Update atlas loading system to use AtlasMetadataService')
    console.log('2. Update services and components to access projection metadata from presets')
    console.log('3. Test that all functionality works with preset-based projection metadata')
  }
}

// Run cleanup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    cleanupAtlasProjectionMetadata()
  }
  catch (error) {
    console.error('Cleanup failed:', error)
    process.exit(1)
  }
}

export { cleanupAtlasProjectionMetadata }
