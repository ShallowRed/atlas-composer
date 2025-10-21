import type { ValidateFunction } from 'ajv'

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { logger } from '#scripts/utils/logger'
/**
 * JSON Schema Validator
 * Runtime validation of config files against atlas.schema.json
 */
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

let schemaValidator: ValidateFunction | null = null

/**
 * Load and compile the JSON schema
 */
async function getSchemaValidator(): Promise<ValidateFunction> {
  if (schemaValidator) {
    return schemaValidator
  }

  try {
    const schemaPath = resolve(process.cwd(), 'configs/schemas/atlas.schema.json')
    const schemaContent = await readFile(schemaPath, 'utf-8')
    const schema = JSON.parse(schemaContent)

    // Dynamic imports for ESM compatibility with CommonJS modules
    // TypeScript has issues with the module types, so we need to cast

    const AjvConstructor = Ajv.default
    const ajv = new AjvConstructor({
      allErrors: true,
      verbose: true,
      strict: false, // Allow additional properties not in schema
    })

    addFormats.default(ajv)

    const validator = ajv.compile(schema) as ValidateFunction
    schemaValidator = validator
    return validator
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to load atlas.schema.json: ${message}`)
  }
}

/**
 * Validate config against JSON schema
 *
 * @param config - The config object to validate
 * @param atlasName - Name of the atlas (for error messages)
 * @throws Error if validation fails
 */
export async function validateConfigSchema(config: unknown, atlasName: string): Promise<void> {
  const validate = await getSchemaValidator()

  if (!validate(config)) {
    logger.error(`Schema validation failed for: ${atlasName}.json`)

    if (validate.errors) {
      logger.error('\nValidation errors:')

      validate.errors.forEach((error: any, index: number) => {
        const path = error.instancePath || '(root)'
        const message = error.message || 'unknown error'

        // Format error with more context
        let errorMsg = `  ${index + 1}. ${path}: ${message}`

        if (error.params && Object.keys(error.params).length > 0) {
          const params = JSON.stringify(error.params, null, 2)
            .split('\n')
            .map(line => `     ${line}`)
            .join('\n')
          errorMsg += `\n${params}`
        }

        logger.log(errorMsg)
      })
    }

    throw new Error(`Config validation failed: ${atlasName}.json does not match schema`)
  }

  // Schema validation passed (silent - only log errors)
}

/**
 * Check if a config matches the schema (returns boolean instead of throwing)
 *
 * @param config - The config object to validate
 * @returns true if valid, false otherwise
 */
export async function isValidConfig(config: unknown): Promise<boolean> {
  try {
    const validate = await getSchemaValidator()
    return validate(config) === true
  }
  catch {
    return false
  }
}
