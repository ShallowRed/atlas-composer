/**
 * CLI Script: Export All Atlases
 *
 * Batch export all available atlas configurations.
 * Useful for documentation, testing, and distribution.
 *
 * Usage:
 *   pnpm export:all [options]
 *
 * Examples:
 *   pnpm export:all
 *   pnpm export:all --format json --output-dir exports
 *   pnpm export:all --format code --lang ts --target d3
 */

import type { CodeGenerationOptions } from '../src/types/export-config'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { exportConfig } from './export-config'
import { parseCliArgs } from './utils/cli-args'
import { logger } from './utils/logger'

interface ExportAllOptions {
  format: 'json' | 'code'
  codeFormat?: 'd3' | 'plot'
  language?: 'javascript' | 'typescript'
  includeComments?: boolean
  includeExamples?: boolean
  outputDir: string
  atlases?: string[]
}

/**
 * Parse command line arguments
 */
function parseArgs(): ExportAllOptions {
  const args = parseCliArgs()

  const format = (args.format || 'json') as 'json' | 'code'
  const codeFormat = (args.codeFormat || args.target || 'd3') as 'd3' | 'plot'
  const language = (args.language || args.lang || 'javascript') as 'javascript' | 'typescript'
  const includeComments = args.comments !== false
  const includeExamples = args.examples !== false
  const outputDir = (args.outputDir || args.dir || 'exports') as string
  const atlases = args.atlases ? (args.atlases as string).split(',') : undefined

  return {
    format,
    codeFormat,
    language,
    includeComments,
    includeExamples,
    outputDir,
    atlases,
  }
}

/**
 * Show usage information
 */
function showUsage() {
  console.log(`
Usage: pnpm export:all [options]

Options:
  --format <type>      Export format: json | code (default: json)
  --codeFormat <type>  Code format: d3 | plot (default: d3)
  --language <lang>    Language: javascript | typescript (default: javascript)
  --comments           Include comments in generated code (default: true)
  --examples           Include usage examples (default: true)
  --output-dir <path>  Output directory (default: exports)
  --atlases <list>     Comma-separated list of specific atlases to export

Aliases:
  --target             Alias for --codeFormat
  --lang               Alias for --language
  --dir                Alias for --output-dir

Examples:
  pnpm export:all
  pnpm export:all --format json --output-dir exports/json
  pnpm export:all --format code --lang ts --output-dir exports/typescript
  pnpm export:all --atlases france,portugal,spain
  `)
}

/**
 * Get list of available atlases from configs directory
 */
function getAvailableAtlases(): string[] {
  const configsDir = resolve(process.cwd(), 'configs')

  if (!existsSync(configsDir)) {
    logger.error('Configs directory not found')
    return []
  }

  return readdirSync(configsDir)
    .filter(file => file.endsWith('.json') && file !== 'schema.json')
    .map(file => file.replace('.json', ''))
}

/**
 * Main export all function
 */
async function exportAll(options: ExportAllOptions): Promise<void> {
  try {
    // Get list of atlases to export
    const atlases = options.atlases || getAvailableAtlases()

    if (atlases.length === 0) {
      logger.error('No atlases found to export')
      process.exit(1)
    }

    logger.info(`Found ${atlases.length} atlases to export: ${atlases.join(', ')}`)

    // Create output directory
    const outputDir = resolve(process.cwd(), options.outputDir)
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
      logger.info(`Created output directory: ${outputDir}`)
    }

    // Export each atlas
    const results: Array<{ atlas: string, success: boolean, error?: string }> = []
    const extension = options.format === 'json'
      ? 'json'
      : options.language === 'typescript' ? 'ts' : 'js'

    for (const atlasId of atlases) {
      try {
        logger.info(`\n${'='.repeat(60)}`)
        logger.info(`Exporting: ${atlasId}`)
        logger.info('='.repeat(60))

        const outputPath = resolve(outputDir, `${atlasId}.${extension}`)

        await exportConfig({
          atlasId,
          format: options.format,
          codeFormat: options.codeFormat,
          language: options.language,
          includeComments: options.includeComments,
          includeExamples: options.includeExamples,
          output: outputPath,
        })

        results.push({ atlas: atlasId, success: true })
        logger.success(`✓ Exported: ${atlasId}`)
      }
      catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        results.push({ atlas: atlasId, success: false, error: errorMsg })
        logger.error(`✗ Failed: ${atlasId} - ${errorMsg}`)
      }
    }

    // Show summary
    logger.info(`\n${'='.repeat(60)}`)
    logger.info('Export Summary')
    logger.info('='.repeat(60))

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    logger.info(`Total: ${results.length}`)
    logger.success(`Successful: ${successful}`)

    if (failed > 0) {
      logger.error(`Failed: ${failed}`)
      logger.error('\nFailed atlases:')
      results
        .filter(r => !r.success)
        .forEach((r) => {
          logger.error(`  - ${r.atlas}: ${r.error}`)
        })
      process.exit(1)
    }
    else {
      logger.success('\n✓ All atlases exported successfully!')
      logger.info(`\nOutput directory: ${outputDir}`)
      logger.info(`Format: ${options.format}${options.format === 'code' ? ` (${options.codeFormat} / ${options.language})` : ''}`)
    }
  }
  catch (error) {
    logger.error('Export all failed:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      logger.debug(error.stack)
    }
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs()
  exportAll(options)
}

export { exportAll, type ExportAllOptions }
