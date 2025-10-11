/**
 * CLI Script: Import and Validate Composite Projection Configuration
 *
 * Imports and validates exported composite projection configurations.
 * Useful for CI/CD pipelines and batch validation.
 *
 * Usage:
 *   pnpm import:config <configPath> [options]
 *
 * Examples:
 *   pnpm import:config exports/france.json
 *   pnpm import:config exports/france.json --atlas france
 *   pnpm import:config exports/france.json --validate-only
 */

import type { ExportedCompositeConfig } from '../src/types/export-config'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { CompositeExportService } from '../src/services/export/composite-export-service'
import { CompositeImportService } from '../src/services/export/composite-import-service'
import { parseCliArgs } from './utils/cli-args'
import { logger } from './utils/logger'

interface ImportOptions {
  configPath: string
  atlasId?: string
  validateOnly: boolean
  verbose: boolean
}

/**
 * Parse command line arguments
 */
function parseArgs(): ImportOptions {
  const args = parseCliArgs()

  // Get config path (first positional argument)
  const configPath = args._[0] as string
  if (!configPath) {
    logger.error('Configuration path is required')
    showUsage()
    process.exit(1)
  }

  return {
    configPath,
    atlasId: args.atlas as string | undefined,
    validateOnly: args.validateOnly || args.validate || false,
    verbose: args.verbose || args.v || false,
  }
}

/**
 * Show usage information
 */
function showUsage() {
  console.log(`
Usage: pnpm import:config <configPath> [options]

Arguments:
  configPath           Path to exported configuration JSON file

Options:
  --atlas <id>         Atlas ID to check compatibility (optional)
  --validate-only      Only validate, don't import
  --verbose, -v        Show detailed validation results

Examples:
  pnpm import:config exports/france.json
  pnpm import:config exports/france.json --atlas france
  pnpm import:config exports/france.json --validate-only
  pnpm import:config exports/france.json --verbose
  `)
}

/**
 * Main import function
 */
async function importConfig(options: ImportOptions): Promise<void> {
  try {
    const configPath = resolve(process.cwd(), options.configPath)

    // Check if file exists
    if (!existsSync(configPath)) {
      logger.error(`File not found: ${configPath}`)
      process.exit(1)
    }

    logger.info(`Reading configuration: ${configPath}`)

    // Read and parse JSON
    const jsonContent = readFileSync(configPath, 'utf-8')
    const importResult = CompositeImportService.importFromJSON(jsonContent)

    // Show validation results
    if (importResult.errors.length > 0) {
      logger.error('Validation failed:')
      importResult.errors.forEach((error) => {
        logger.error(`  - ${error}`)
      })
      process.exit(1)
    }

    if (importResult.warnings.length > 0) {
      logger.warn('Validation warnings:')
      importResult.warnings.forEach((warning) => {
        logger.warn(`  - ${warning}`)
      })
    }

    if (!importResult.config) {
      logger.error('Failed to parse configuration')
      process.exit(1)
    }

    logger.success('Configuration is valid')

    const config = importResult.config

    // Show config details
    if (options.verbose) {
      logger.info('\nConfiguration Details:')
      logger.info(`  Atlas: ${config.metadata.atlasName} (${config.metadata.atlasId})`)
      logger.info(`  Version: ${config.version}`)
      logger.info(`  Pattern: ${config.pattern}`)
      logger.info(`  Territories: ${config.territories.length}`)
      logger.info(`  Export Date: ${new Date(config.metadata.exportDate).toLocaleString()}`)
      logger.info(`  Created With: ${config.metadata.createdWith}`)

      if (config.metadata.notes) {
        logger.info(`  Notes: ${config.metadata.notes}`)
      }

      logger.info('\nTerritories:')
      config.territories.forEach((territory) => {
        logger.info(`  - ${territory.name} (${territory.code})`)
        logger.info(`    Role: ${territory.role}`)
        logger.info(`    Projection: ${territory.projectionId}`)
        logger.info(`    Scale: ${territory.parameters.scale.toFixed(0)} (${(territory.parameters.scaleMultiplier * 100).toFixed(0)}%)`)
        logger.info(`    Translation: [${territory.layout.translateOffset[0]}, ${territory.layout.translateOffset[1]}]`)
      })
    }

    // Check atlas compatibility if specified
    if (options.atlasId) {
      logger.info(`\nChecking compatibility with atlas: ${options.atlasId}`)
      const compatibility = CompositeImportService.checkAtlasCompatibility(
        config,
        options.atlasId,
      )

      if (compatibility.warnings.length > 0) {
        logger.warn('Compatibility warnings:')
        compatibility.warnings.forEach((warning) => {
          logger.warn(`  - ${warning}`)
        })
      }
      else {
        logger.success('Configuration is compatible with specified atlas')
      }
    }

    // Validate against internal service
    const validation = CompositeExportService.validateExportedConfig(config)

    if (validation.errors.length > 0) {
      logger.error('\nInternal validation errors:')
      validation.errors.forEach((error) => {
        logger.error(`  - ${error}`)
      })
      process.exit(1)
    }

    if (validation.warnings.length > 0 && options.verbose) {
      logger.warn('\nInternal validation warnings:')
      validation.warnings.forEach((warning) => {
        logger.warn(`  - ${warning}`)
      })
    }

    logger.success('\n✓ Configuration is valid and ready to import')

    if (options.validateOnly) {
      logger.info('\nValidation-only mode: No changes made')
    }
    else {
      logger.info('\nNote: This is a CLI validation tool.')
      logger.info('To actually import into the application, use the import feature in the UI.')
    }
  }
  catch (error) {
    logger.error('Import failed:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      logger.debug(error.stack)
    }
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs()
  importConfig(options)
}

export { importConfig, type ImportOptions }
