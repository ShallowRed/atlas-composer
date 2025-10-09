/**
 * Config Migration Script
 * Migrates configs from old role names to new role names
 *
 * OLD -> NEW:
 * - 'mainland' -> 'primary'
 * - 'overseas' -> 'secondary'
 * - 'member-state' -> 'member'
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ROLE_MAP = {
  'mainland': 'primary',
  'overseas': 'secondary',
  'member-state': 'member',
  'embedded': 'embedded', // unchanged
}

function migrateConfig(configPath) {
  console.log(`\n📝 Migrating: ${path.basename(configPath)}`)

  const content = fs.readFileSync(configPath, 'utf8')
  const config = JSON.parse(content)

  let changeCount = 0

  // Migrate territory roles
  if (config.territories && Array.isArray(config.territories)) {
    config.territories.forEach((territory) => {
      const oldRole = territory.role
      const newRole = ROLE_MAP[oldRole]

      if (newRole && newRole !== oldRole) {
        territory.role = newRole
        changeCount++
        console.log(`  ✓ Territory ${territory.code}: "${oldRole}" -> "${newRole}"`)
      }
      else if (!ROLE_MAP[oldRole]) {
        console.warn(`  ⚠️  Unknown role "${oldRole}" for territory ${territory.code}`)
      }
    })
  }

  // Write back
  const newContent = `${JSON.stringify(config, null, 2)}\n`
  fs.writeFileSync(configPath, newContent)

  console.log(`✅ Migrated ${changeCount} territories in ${path.basename(configPath)}`)

  return changeCount
}

function main() {
  console.log('🚀 Starting config migration...\n')
  console.log('Role mappings:')
  Object.entries(ROLE_MAP).forEach(([old, new_]) => {
    console.log(`  "${old}" -> "${new_}"`)
  })

  const configsDir = path.join(__dirname, '../configs')
  const configFiles = ['france.json', 'portugal.json', 'usa.json', 'eu.json']

  let totalChanges = 0

  configFiles.forEach((file) => {
    const configPath = path.join(configsDir, file)
    if (fs.existsSync(configPath)) {
      totalChanges += migrateConfig(configPath)
    }
    else {
      console.warn(`⚠️  Config not found: ${file}`)
    }
  })

  console.log(`\n✨ Migration complete! Total changes: ${totalChanges}`)
}

main()
