/**
 * CLI Arguments Parser
 * Provides unified argument parsing for all scripts
 */

import process from 'node:process'
import { logger } from './logger.js'
import { DEFAULT_RESOLUTION, isValidResolution } from './ne-data.js'

/**
 * Parse command line arguments
 *
 * Supports patterns:
 *   script <region>
 *   script <region> --resolution=10m
 *   script --resolution=50m <region>
 *   script --help
 *
 * @returns {object} Parsed arguments
 */
export function parseArgs() {
  const args = process.argv.slice(2)

  const parsed = {
    region: null,
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
      if (isValidResolution(value)) {
        parsed.resolution = value
      }
      else {
        logger.warning(`Invalid --resolution value: ${value}`)
      }
    }
    else if (arg.startsWith('--')) {
      parsed._unknown.push(arg)
    }
    else if (!parsed.region) {
      parsed.region = arg
    }
    else {
      parsed._unknown.push(arg)
    }
  }

  return parsed
}

/**
 * Get resolution with precedence: CLI flag > env var > default
 *
 * @param {object} args - Parsed arguments from parseArgs()
 * @returns {string} Resolution ('10m', '50m', or '110m')
 */
export function getResolution(args) {
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
 *
 * @param {string} scriptName - Name of the script
 * @param {string} description - Description of what the script does
 * @param {string} usage - Usage pattern
 * @param {object} options - Available options
 */
export function showHelp(scriptName, description, usage, options = {}) {
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
 *
 * @param {object} args - Parsed arguments
 * @param {string[]} required - Required argument names
 * @returns {boolean} True if all required args present
 */
export function validateRequired(args, required) {
  const missing = required.filter(name => !args[name])

  if (missing.length > 0) {
    logger.error(`Missing required argument(s): ${missing.join(', ')}`)
    return false
  }

  return true
}
