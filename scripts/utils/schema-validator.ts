import type { ValidateFunction } from 'ajv'

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { logger } from '#scripts/utils/logger'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const schemaValidators = new Map<string, ValidateFunction>()

async function getSchemaValidator(schemaFile: string): Promise<ValidateFunction> {
  const cached = schemaValidators.get(schemaFile)
  if (cached) {
    return cached
  }

  try {
    const schemaPath = resolve(process.cwd(), 'configs/schemas', schemaFile)
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
    schemaValidators.set(schemaFile, validator)
    return validator
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to load ${schemaFile}: ${message}`)
  }
}

export async function validateConfigSchema(config: unknown, atlasName: string): Promise<void> {
  const validate = await getSchemaValidator('atlas.schema.json')

  if (!validate(config)) {
    logger.error(`Schema validation failed for: ${atlasName}.json`)

    if (validate.errors) {
      logger.error('\nValidation errors:')

      validate.errors.forEach((error: any, index: number) => {
        const path = error.instancePath || '(root)'
        const message = error.message || 'unknown error'

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
}

export async function validateRegistrySchema(registry: unknown): Promise<string[]> {
  const validate = await getSchemaValidator('atlas-registry.schema.json')
  if (validate(registry)) {
    return []
  }
  return (validate.errors ?? []).map((error) => {
    const allowedValues = error.params.allowedValues as unknown[] | undefined
    const allowed = allowedValues ? ` (${allowedValues.join(', ')})` : ''
    return `${error.instancePath || '(root)'}: ${error.message ?? 'unknown error'}${allowed}`
  })
}
