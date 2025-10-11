/**
 * CLI Script: Export Composite Projection Configuration
 *
 * Exports atlas configurations to JSON or generated code for external use.
 *
 * Usage:
 *   pnpm export:config <atlasId> [options]
 *
 * Examples:
 *   pnpm export:config france --format json --output exports/france.json
 *   pnpm export:config portugal --format code --lang ts --output exports/portugal.ts
 *   pnpm export:config eu --format d3 --lang js --comments --examples
 */

import type { CompositeProjectionConfig } from '../src/types'
import type { CodeGenerationOptions, ExportedCompositeConfig } from '../src/types/export-config'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { CompositeExportService } from '../src/services/export/composite-export-service'
import { CompositeProjection } from '../src/services/projection/composite-projection'
import { parseCliArgs } from './utils/cli-args'
import { loadAtlasConfig } from './utils/export-helpers'
import { logger } from './utils/logger'

interface ExportOptions {
  atlasId: string
  format: 'json' | 'code'
  codeFormat?: 'd3' | 'plot'
  language?: 'javascript' | 'typescript'
  includeComments?: boolean
  includeExamples?: boolean
  output?: string
  notes?: string
}

/**
 * Parse command line arguments
 */
function parseArgs(): ExportOptions {
  const args = parseCliArgs()

  // Get atlas ID (first positional argument)
  const atlasId = args._[0] as string
  if (!atlasId) {
    logger.error('Atlas ID is required')
    showUsage()
    process.exit(1)
  }

  // Parse options
  const format = (args.format || 'json') as 'json' | 'code'
  const codeFormat = (args.codeFormat || args.target || 'd3') as 'd3' | 'plot'
  const language = (args.language || args.lang || 'javascript') as 'javascript' | 'typescript'
  const includeComments = args.comments !== false
  const includeExamples = args.examples !== false
  const output = args.output || args.o as string | undefined
  const notes = args.notes as string | undefined

  return {
    atlasId,
    format,
    codeFormat,
    language,
    includeComments,
    includeExamples,
    output,
    notes,
  }
}

/**
 * Show usage information
 */
function showUsage() {
  console.log(`
Usage: pnpm export:config <atlasId> [options]

Arguments:
  atlasId              Atlas identifier (france, portugal, spain, eu, usa)

Options:
  --format <type>      Export format: json | code (default: json)
  --codeFormat <type>  Code format: d3 | plot (default: d3)
  --language <lang>    Language: javascript | typescript (default: javascript)
  --comments           Include comments in generated code (default: true)
  --examples           Include usage examples (default: true)
  --output <path>      Output file path (optional, prints to stdout if omitted)
  --notes <text>       Additional notes to include in metadata

Aliases:
  --target             Alias for --codeFormat
  --lang               Alias for --language
  -o                   Alias for --output

Examples:
  pnpm export:config france
  pnpm export:config france --format json --output exports/france.json
  pnpm export:config portugal --format code --lang ts --output exports/portugal.ts
  pnpm export:config eu --format code --target plot --lang js
  `)
}

/**
 * Main export function
 */
async function exportConfig(options: ExportOptions): Promise<void> {
  try {
    logger.info(`Exporting atlas: ${options.atlasId}`)

    // Load atlas configuration
    const atlasConfig = await loadAtlasConfig(options.atlasId)
    logger.success(`Loaded atlas configuration: ${atlasConfig.name}`)

    // Get composite projection config
    const compositeConfig = atlasConfig.compositeProjectionConfig
    if (!compositeConfig) {
      logger.error(`Atlas '${options.atlasId}' does not have a composite projection configuration`)
      process.exit(1)
    }

    // Create composite projection instance
    const compositeProjection = new CompositeProjection(compositeConfig)
    logger.info('Created composite projection instance')

    // Export to JSON
    const exported = CompositeExportService.exportToJSON(
      compositeProjection,
      atlasConfig.id,
      atlasConfig.name,
      compositeConfig as CompositeProjectionConfig,
      options.notes,
    )

    logger.success('Generated export configuration')

    // Generate output content
    let content: string
    let extension: string

    if (options.format === 'json') {
      content = JSON.stringify(exported, null, 2)
      extension = 'json'
      logger.info('Format: JSON')
    }
    else {
      // Generate code
      const codeOptions: CodeGenerationOptions = {
        format: options.codeFormat!,
        language: options.language!,
        includeComments: options.includeComments!,
        includeExamples: options.includeExamples!,
      }

      content = CompositeExportService.generateCode(exported, codeOptions)
      extension = options.language === 'typescript' ? 'ts' : 'js'
      logger.info(`Format: ${options.codeFormat} (${options.language})`)
    }

    // Output to file or stdout
    if (options.output) {
      const outputPath = resolve(process.cwd(), options.output)

      // Create directory if it doesn't exist
      const dir = dirname(outputPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
        logger.info(`Created directory: ${dir}`)
      }

      // Write file
      writeFileSync(outputPath, content, 'utf-8')
      logger.success(`Exported to: ${outputPath}`)

      // Show file stats
      const stats = {
        territories: exported.territories.length,
        pattern: exported.pattern,
        size: `${(content.length / 1024).toFixed(2)} KB`,
      }
      logger.info(`Territories: ${stats.territories}`)
      logger.info(`Pattern: ${stats.pattern}`)
      logger.info(`Size: ${stats.size}`)
    }
    else {
      // Print to stdout
      console.log(content)
    }
  }
  catch (error) {
    logger.error('Export failed:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      logger.debug(error.stack)
    }
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs()
  exportConfig(options)
}

export { exportConfig, type ExportOptions }
