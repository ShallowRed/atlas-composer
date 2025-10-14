#!/usr/bin/env tsx

/**
 * Atlas Projection Metadata Migration Script
 *
 * Extracts projection-related metadata from atlas configuration files
 * and adds it to corresponding preset files as atlasMetadata section.
 *
 * Usage: pnpm tsx scripts/migrate-atlas-projection-metadata.ts
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

interface AtlasProjectionMetadata {
  compositeProjections?: string[]
  defaultCompositeProjection?: string
  projectionPreferences?: {
    recommended?: string[]
    default?: {
      mainland?: string
      overseas?: string
    }
    prohibited?: string[]
  }
  projectionParameters?: {
    center?: { longitude: number, latitude: number }
    rotate?: {
      mainland?: [number, number]
      azimuthal?: [number, number]
    }
    parallels?: { conic?: [number, number] }
  }
  mapDisplayDefaults?: {
    showGraticule?: boolean
    showSphere?: boolean
    showCompositionBorders?: boolean
    showMapLimits?: boolean
  }
}

interface AtlasConfig {
  id: string
  compositeProjections?: string[]
  defaultCompositeProjection?: string
  projectionPreferences?: {
    recommended?: string[]
    default?: {
      mainland?: string
      overseas?: string
    }
    prohibited?: string[]
  }
  projection?: {
    center?: { longitude: number, latitude: number }
    rotate?: {
      mainland?: [number, number]
      azimuthal?: [number, number]
    }
    parallels?: { conic?: [number, number] }
  }
  mapDisplayDefaults?: {
    showGraticule?: boolean
    showSphere?: boolean
    showCompositionBorders?: boolean
    showMapLimits?: boolean
  }
}

interface PresetConfig {
  version: string
  metadata: {
    atlasId: string
    atlasName: string
    exportDate: string
    createdWith: string
    notes?: string
  }
  pattern: string
  referenceScale: number
  territories: any[]
  atlasMetadata?: AtlasProjectionMetadata
}

function extractProjectionMetadata(atlasConfig: AtlasConfig): AtlasProjectionMetadata | null {
  const metadata: AtlasProjectionMetadata = {}
  let hasMetadata = false

  // Extract composite projections
  if (atlasConfig.compositeProjections) {
    metadata.compositeProjections = atlasConfig.compositeProjections
    hasMetadata = true
  }

  if (atlasConfig.defaultCompositeProjection) {
    metadata.defaultCompositeProjection = atlasConfig.defaultCompositeProjection
    hasMetadata = true
  }

  // Extract projection preferences
  if (atlasConfig.projectionPreferences) {
    metadata.projectionPreferences = atlasConfig.projectionPreferences
    hasMetadata = true
  }

  // Extract projection parameters
  if (atlasConfig.projection) {
    metadata.projectionParameters = atlasConfig.projection
    hasMetadata = true
  }

  // Extract map display defaults
  if (atlasConfig.mapDisplayDefaults) {
    metadata.mapDisplayDefaults = atlasConfig.mapDisplayDefaults
    hasMetadata = true
  }

  return hasMetadata ? metadata : null
}

function migrateAtlasProjectionMetadata() {
  console.log('🔄 Migrating atlas projection metadata to preset files...\n')

  // Find all atlas configuration files
  const configsDir = 'configs'
  const allFiles = readdirSync(configsDir)
  const atlasConfigFiles = allFiles
    .filter((file: string) => file.endsWith('.json') && file !== 'schema.json')
    .map((file: string) => join(configsDir, file))

  const results: Array<{ atlas: string, status: 'success' | 'skipped' | 'error', message: string }> = []

  for (const atlasConfigFile of atlasConfigFiles) {
    try {
      // Read atlas configuration
      const atlasConfig: AtlasConfig = JSON.parse(readFileSync(atlasConfigFile, 'utf-8'))
      const atlasId = atlasConfig.id

      console.log(`📋 Processing atlas: ${atlasId}`)

      // Extract projection metadata
      const projectionMetadata = extractProjectionMetadata(atlasConfig)

      if (!projectionMetadata) {
        console.log(`   ⚠️  No projection metadata found, skipping`)
        results.push({
          atlas: atlasId,
          status: 'skipped',
          message: 'No projection metadata found',
        })
        continue
      }

      // Find corresponding preset file
      const presetFile = join('configs/presets', `${atlasId}-default.json`)

      if (!existsSync(presetFile)) {
        console.log(`   ❌ Preset file not found: ${presetFile}`)
        results.push({
          atlas: atlasId,
          status: 'error',
          message: `Preset file not found: ${presetFile}`,
        })
        continue
      }

      // Read preset configuration
      const presetConfig: PresetConfig = JSON.parse(readFileSync(presetFile, 'utf-8'))

      // Add atlas metadata to preset
      presetConfig.atlasMetadata = projectionMetadata

      // Update preset metadata notes
      const originalNotes = presetConfig.metadata.notes || ''
      presetConfig.metadata.notes = `${originalNotes}${originalNotes ? ' | ' : ''}Atlas projection metadata migrated from atlas config`

      // Write updated preset file
      writeFileSync(presetFile, `${JSON.stringify(presetConfig, null, 2)}\n`)

      console.log(`   ✅ Successfully migrated projection metadata to ${presetFile}`)
      results.push({
        atlas: atlasId,
        status: 'success',
        message: 'Projection metadata migrated to preset',
      })
    }
    catch (error) {
      console.error(`   ❌ Error processing ${atlasConfigFile}:`, error)
      results.push({
        atlas: atlasConfigFile,
        status: 'error',
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }

  // Print summary
  console.log('\n📊 Migration Summary:')
  console.log('='.repeat(50))

  const successful = results.filter(r => r.status === 'success').length
  const skipped = results.filter(r => r.status === 'skipped').length
  const errors = results.filter(r => r.status === 'error').length

  console.log(`✅ Successful migrations: ${successful}`)
  console.log(`⚠️  Skipped (no metadata): ${skipped}`)
  console.log(`❌ Errors: ${errors}`)

  if (errors > 0) {
    console.log('\n❌ Error Details:')
    results
      .filter(r => r.status === 'error')
      .forEach(r => console.log(`   ${r.atlas}: ${r.message}`))
  }

  console.log('\n🎉 Atlas projection metadata migration completed!')

  if (successful > 0) {
    console.log('\n📝 Next steps:')
    console.log('1. Verify preset files contain atlasMetadata sections')
    console.log('2. Update preset loading system to handle atlas metadata')
    console.log('3. Remove projection metadata from atlas configurations')
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    migrateAtlasProjectionMetadata()
  }
  catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

export { migrateAtlasProjectionMetadata }
