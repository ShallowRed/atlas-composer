import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import Ajv from 'ajv'
import standaloneCode from 'ajv/dist/standalone/index.js'

// Generates in src/generated/ the validation code and the schema values that src/ imports,
// so that the bundle of a user contains neither ajv nor the schema files.
const root = join(import.meta.dirname, '..')
const output = join(root, 'src/generated')

async function readSchema(name) {
  return JSON.parse(await readFile(join(root, `schemas/${name}.schema.json`), 'utf8'))
}

const definitions = await readSchema('definitions')
const compositeProjection = await readSchema('composite-projection')

const ajv = new Ajv({ allErrors: true, code: { source: true, esm: true } })
ajv.addSchema(definitions)
const validate = ajv.compile(compositeProjection)

const declaration = `export interface SchemaError {
  instancePath: string
  keyword: string
  params: Record<string, unknown>
  message?: string
}

declare const validate: {
  (data: unknown): boolean
  errors?: SchemaError[] | null
}

export default validate
`

const { projectionFamily, projectionParameters } = definitions.definitions
const constants = `export const PROJECTION_FAMILIES = ${JSON.stringify(projectionFamily.enum)} as const

export const PROJECTION_PARAMETER_KEYS = ${JSON.stringify(Object.keys(projectionParameters.properties))} as const

export const DEFAULT_SCALE_MULTIPLIER = ${JSON.stringify(projectionParameters.properties.scaleMultiplier.default)}

export const VERSION_PATTERN = new RegExp(${JSON.stringify(compositeProjection.properties.version.pattern)})
`

await mkdir(output, { recursive: true })
await writeFile(join(output, 'validate.js'), standaloneCode(ajv, validate))
await writeFile(join(output, 'validate.d.ts'), declaration)
await writeFile(join(output, 'constants.ts'), constants)
