import type { ValidateFunction } from 'ajv'
import type { PresetType } from '#types'

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { logger } from '#scripts/utils/logger'

type ViewPresetType = Exclude<PresetType, 'composite-custom'>

const schemaValidators = new Map<string, ValidateFunction>()

const AjvConstructor = Ajv.default
type AjvInstance = InstanceType<typeof AjvConstructor>

function createAjv(): AjvInstance {
  const ajv = new AjvConstructor({
    allErrors: true,
    verbose: true,
    strict: false, // Allow additional properties not in schema
  })
  addFormats.default(ajv)
  return ajv
}

async function getSchemaValidator(schemaFile: string): Promise<ValidateFunction> {
  const cached = schemaValidators.get(schemaFile)
  if (cached) {
    return cached
  }

  try {
    const schemaPath = resolve(process.cwd(), 'configs/schemas', schemaFile)
    const schemaContent = await readFile(schemaPath, 'utf-8')
    const schema = JSON.parse(schemaContent)

    const validator = createAjv().compile(schema) as ValidateFunction
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

// The view preset schemas refer to their definition files by relative path: ajv resolves
// such a reference against the key of the schema, here the URL of its file.
const VIEW_PRESET_SCHEMA_FILES = [
  'configs/schemas/preset-unified.schema.json',
  'configs/schemas/preset-split.schema.json',
  'configs/schemas/preset-built-in-composite.schema.json',
  'configs/schemas/preset-definitions.schema.json',
  'packages/specification/schemas/definitions.schema.json',
]

function schemaUrl(file: string): string {
  return pathToFileURL(resolve(process.cwd(), file)).href
}

let viewPresetSchemas: Promise<AjvInstance> | undefined

async function loadViewPresetSchemas(): Promise<AjvInstance> {
  const ajv = createAjv()
  for (const file of VIEW_PRESET_SCHEMA_FILES) {
    const schema = JSON.parse(await readFile(resolve(process.cwd(), file), 'utf-8'))
    ajv.addSchema(schema, schemaUrl(file))
  }
  return ajv
}

function listSchemaErrors(validate: ValidateFunction, value: unknown): string[] {
  if (validate(value)) {
    return []
  }
  return (validate.errors ?? []).map((error) => {
    const allowedValues = error.params.allowedValues as unknown[] | undefined
    const allowed = allowedValues ? ` (${allowedValues.join(', ')})` : ''
    return `${error.instancePath || '(root)'}: ${error.message ?? 'unknown error'}${allowed}`
  })
}

export async function validateRegistrySchema(registry: unknown): Promise<string[]> {
  return listSchemaErrors(await getSchemaValidator('atlas-registry.schema.json'), registry)
}

export async function validateViewPresetSchema(preset: unknown, type: ViewPresetType): Promise<string[]> {
  viewPresetSchemas ??= loadViewPresetSchemas()
  const file = `configs/schemas/preset-${type}.schema.json`
  const validate = (await viewPresetSchemas).getSchema(schemaUrl(file))
  if (!validate) {
    throw new Error(`Failed to load ${file}`)
  }
  return listSchemaErrors(validate, preset)
}
