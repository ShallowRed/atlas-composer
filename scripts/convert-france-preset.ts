#!/usr/bin/env tsx
/**
 * Convert France preset from normalized to pixel-based clipExtent format
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { convertPresetFile } from './utils/clipextent-converter.js'

async function main() {
  const presetPath = join(process.cwd(), 'configs/presets/france-default.json')
  const backupPath = join(process.cwd(), 'configs/presets/france-default.json.backup')

  console.log('Converting France preset to pixel-based clipExtent format...')

  // Read current preset
  const currentPreset = JSON.parse(readFileSync(presetPath, 'utf-8'))

  // Create backup
  writeFileSync(backupPath, JSON.stringify(currentPreset, null, 2))
  console.log(`Backup created: ${backupPath}`)

  // Convert to pixel format
  const convertedPreset = convertPresetFile(currentPreset)

  // Write converted preset
  writeFileSync(presetPath, JSON.stringify(convertedPreset, null, 2))
  console.log(`Converted preset written: ${presetPath}`)

  console.log('Conversion completed!')
}

// Run the conversion
main().catch(console.error)
