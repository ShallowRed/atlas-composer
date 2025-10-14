#!/usr/bin/env tsx

/**
 * Migration Script: Convert Atlas Rendering Properties to Presets
 *
 * This script extracts rendering configuration from atlas configs and converts
 * them to proper preset files, eliminating the architectural duplication.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

interface RenderingConfig {
  offset: [number, number]
  projectionType: string
  scale?: number
  rotate?: [number, number] | [number, number, number]
  parallels?: [number, number]
  clipExtent?: {
    x1: number
    y1: number
    x2: number
    y2: number
  }
}

interface AtlasTerritory {
  id: string
  code: string
  name: string | { en: string, [key: string]: string }
  role: 'primary' | 'secondary' | 'member'
  bounds: [[number, number], [number, number]]
  center?: [number, number]
  rendering?: RenderingConfig
}

interface AtlasConfig {
  id: string
  name: string | { en: string, [key: string]: string }
  pattern?: 'single-focus' | 'equal-members'
  territories: AtlasTerritory[] | '*'
}

interface PresetTerritory {
  code: string
  name: string
  role: 'primary' | 'secondary' | 'member'
  projectionId: string
  projectionFamily: string
  parameters: {
    center?: [number, number]
    rotate?: [number, number, number]
    parallels?: [number, number]
    scale: number
    baseScale: number
    scaleMultiplier: number
  }
  layout: {
    translateOffset: [number, number]
    clipExtent?: [[number, number], [number, number]] | null
  }
  bounds: [[number, number], [number, number]]
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
  pattern: 'single-focus' | 'equal-members'
  referenceScale: number
  territories: PresetTerritory[]
}

// Projection family mapping
const PROJECTION_FAMILIES: Record<string, string> = {
  'mercator': 'CYLINDRICAL',
  'transverse-mercator': 'CYLINDRICAL',
  'equirectangular': 'CYLINDRICAL',
  'miller': 'CYLINDRICAL',
  'albers': 'CONIC',
  'conic-conformal': 'CONIC',
  'conic-equal-area': 'CONIC',
  'conic-equidistant': 'CONIC',
  'azimuthal-equal-area': 'AZIMUTHAL',
  'azimuthal-equidistant': 'AZIMUTHAL',
  'orthographic': 'AZIMUTHAL',
  'stereographic': 'AZIMUTHAL',
  'gnomonic': 'AZIMUTHAL',
  'equal-earth': 'PSEUDOCYLINDRICAL',
  'mollweide': 'PSEUDOCYLINDRICAL',
  'sinusoidal': 'PSEUDOCYLINDRICAL',
  'robinson': 'PSEUDOCYLINDRICAL',
  'winkel3': 'PSEUDOCYLINDRICAL',
  'bonne': 'PSEUDOCONIC',
  'aitoff': 'MISCELLANEOUS',
  'hammer': 'MISCELLANEOUS',
  'bertin1953': 'MISCELLANEOUS',
  'polyhedral-waterman': 'POLYHEDRAL',
}

function getProjectionFamily(projectionId: string): string {
  return PROJECTION_FAMILIES[projectionId] || 'MISCELLANEOUS'
}

function convertClipExtent(clipExtent?: { x1: number, y1: number, x2: number, y2: number }): [[number, number], [number, number]] | null {
  if (!clipExtent)
    return null
  return [[clipExtent.x1, clipExtent.y1], [clipExtent.x2, clipExtent.y2]]
}

function extractTerritoryName(name: string | { en: string, [key: string]: string }): string {
  return typeof name === 'string' ? name : name.en
}

function extractAtlasName(name: string | { en: string, [key: string]: string }): string {
  return typeof name === 'string' ? name : name.en
}

function convertRenderingToPreset(atlasConfig: AtlasConfig): PresetConfig | null {
  if (atlasConfig.territories === '*') {
    console.log(`⚠️  Skipping wildcard atlas: ${atlasConfig.id}`)
    return null
  }

  const territories = atlasConfig.territories as AtlasTerritory[]
  const territoriesWithRendering = territories.filter(t => t.rendering)

  if (territoriesWithRendering.length === 0) {
    console.log(`⚠️  No rendering config found in atlas: ${atlasConfig.id}`)
    return null
  }

  // Determine reference scale from primary territory
  const primaryTerritory = territories.find(t => t.role === 'primary')
  const referenceScale = primaryTerritory?.rendering?.scale || 2700

  const presetTerritories: PresetTerritory[] = territoriesWithRendering.map((territory) => {
    const rendering = territory.rendering!
    const scale = rendering.scale || referenceScale

    return {
      code: territory.code,
      name: extractTerritoryName(territory.name),
      role: territory.role,
      projectionId: rendering.projectionType,
      projectionFamily: getProjectionFamily(rendering.projectionType),
      parameters: {
        center: territory.center,
        rotate: rendering.rotate
          ? (rendering.rotate.length === 2 ? [...rendering.rotate, 0] as [number, number, number] : rendering.rotate as [number, number, number])
          : [0, 0, 0],
        parallels: rendering.parallels || [0, 0],
        scale,
        baseScale: scale,
        scaleMultiplier: 1,
      },
      layout: {
        translateOffset: rendering.offset,
        clipExtent: convertClipExtent(rendering.clipExtent),
      },
      bounds: territory.bounds,
    }
  })

  return {
    version: '1.0',
    metadata: {
      atlasId: atlasConfig.id,
      atlasName: extractAtlasName(atlasConfig.name),
      exportDate: new Date().toISOString(),
      createdWith: 'Migration Script v1.0',
      notes: 'Generated from atlas rendering configuration during migration',
    },
    pattern: atlasConfig.pattern || 'single-focus',
    referenceScale,
    territories: presetTerritories,
  }
}

async function main() {
  console.log('🚀 Starting migration: Atlas rendering → Presets')

  const configsDir = join(process.cwd(), 'configs')
  const presetsDir = join(process.cwd(), 'configs', 'presets')

  // Find all atlas config files
  const allFiles = readdirSync(configsDir)
  const configFiles = allFiles.filter(file =>
    file.endsWith('.json') && file !== 'schema.json',
  )

  let processedCount = 0
  let skippedCount = 0
  const createdPresets: string[] = []

  for (const configFile of configFiles) {
    const configPath = join(configsDir, configFile)
    const atlasId = configFile.replace('.json', '')

    console.log(`\n📁 Processing: ${atlasId}`)

    try {
      const configContent = readFileSync(configPath, 'utf-8')
      const atlasConfig: AtlasConfig = JSON.parse(configContent)

      const presetConfig = convertRenderingToPreset(atlasConfig)

      if (!presetConfig) {
        skippedCount++
        continue
      }

      // Generate preset filename
      const presetFilename = `${atlasId}-default.json`
      const presetPath = join(presetsDir, presetFilename)

      // Check if preset already exists
      if (existsSync(presetPath)) {
        console.log(`   ⚠️  Preset already exists: ${presetFilename}`)
        console.log(`   📝 Creating backup: ${presetFilename}.backup`)
        const backupPath = join(presetsDir, `${presetFilename}.backup`)
        const existingContent = readFileSync(presetPath, 'utf-8')
        writeFileSync(backupPath, existingContent)
      }

      // Write new preset
      writeFileSync(presetPath, JSON.stringify(presetConfig, null, 2))
      console.log(`   ✅ Created preset: ${presetFilename}`)
      console.log(`   📊 Territories: ${presetConfig.territories.length}`)
      console.log(`   🎯 Reference scale: ${presetConfig.referenceScale}`)

      createdPresets.push(presetFilename)
      processedCount++
    }
    catch (error) {
      console.error(`   ❌ Error processing ${atlasId}:`, error)
      skippedCount++
    }
  }

  console.log('\n📈 Migration Summary:')
  console.log(`   ✅ Processed: ${processedCount} atlases`)
  console.log(`   ⚠️  Skipped: ${skippedCount} atlases`)
  console.log(`   📄 Created presets: ${createdPresets.length}`)

  if (createdPresets.length > 0) {
    console.log('\n📋 Created Preset Files:')
    createdPresets.forEach(preset => console.log(`   • ${preset}`))

    console.log('\n🔄 Next Steps:')
    console.log('   1. Review the generated preset files')
    console.log('   2. Update atlas configs to reference the new presets')
    console.log('   3. Mark rendering properties as deprecated in schema')
    console.log('   4. Update codebase to use preset-only configuration')
  }

  console.log('\n🎉 Migration completed!')
}

// Run the migration
main().catch(console.error)
