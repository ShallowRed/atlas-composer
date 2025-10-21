/**
 * CLI Argument Parser
 *
 * Provides unified argument parsing for all scripts.
 * The first positional argument is available as both .atlas and .country
 * to support different script contexts (atlas config scripts vs dev utilities).
 */

import process from 'node:process'
import { logger } from '#scripts/utils/logger'
import { DEFAULT_RESOLUTION, isValidResolution } from '#scripts/utils/ne-data'

/**
 * Parsed command line arguments
 */
export interface ParsedArgs {
  atlas: string | null
  country: string | null
  resolution: string | null
  help: boolean
  _unknown: string[]
}

/**
 * Parse command line arguments
 *
 * Supports patterns:
 *   script <atlas>
 *   script <atlas> --resolution=10m
 *   script --resolution=50m <region>
 *   script --help
 */
export function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2)

  const parsed: ParsedArgs = {
    atlas: null, // For prepare/validate scripts (france, portugal, europe)
    country: null, // Alias for dev scripts (lookup, analyze)
    resolution: null,
    help: false,
    _unknown: [],
  }

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      parsed.help = true
    }
    else if (arg.startsWith('--resolution=')) {
      const value = arg.split('=')[1]
      if (value && isValidResolution(value)) {
        parsed.resolution = value
      }
      else {
        logger.warning(`Invalid --resolution value: ${value || 'empty'}`)
      }
    }
    else if (arg.startsWith('--')) {
      parsed._unknown.push(arg)
    }
    else if (!parsed.atlas) {
      // First positional argument - available as both atlas and country
      parsed.atlas = arg
      parsed.country = arg
    }
    else {
      parsed._unknown.push(arg)
    }
  }

  return parsed
}

/**
 * Get resolution with precedence: CLI flag > env var > default
 */
export function getResolution(args: ParsedArgs): string {
  // CLI flag takes precedence
  if (args.resolution) {
    return args.resolution
  }

  // Then environment variable
  const envResolution = process.env.NE_RESOLUTION
  if (envResolution && isValidResolution(envResolution)) {
    return envResolution
  }

  // Finally default
  return DEFAULT_RESOLUTION
}

/**
 * Show help message
 */
export function showHelp(
  scriptName: string,
  description: string,
  usage: string,
  options: Record<string, string> = {},
): void {
  logger.section(scriptName)
  logger.log(description)
  logger.newline()

  logger.log('Usage:')
  logger.log(`  ${usage}`)
  logger.newline()

  if (Object.keys(options).length > 0) {
    logger.log('Options:')
    for (const [flag, desc] of Object.entries(options)) {
      logger.log(`  ${flag.padEnd(25)} ${desc}`)
    }
    logger.newline()
  }
}

/**
 * Validate that required arguments are present
 */
export function validateRequired(args: ParsedArgs, required: string[]): boolean {
  const missing = required.filter(name => !args[name as keyof ParsedArgs])

  if (missing.length > 0) {
    logger.error(`Missing required argument(s): ${missing.join(', ')}`)
    return false
  }

  return true
}
