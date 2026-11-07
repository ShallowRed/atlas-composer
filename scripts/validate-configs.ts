import type { BackendConfig } from '#types'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import process from 'node:process'
import { listConfigs, listPresetFiles, loadConfig, loadRegistry } from '#scripts/config/loader'
import { logger } from '#scripts/utils/logger'
import { validateRegistrySchema } from '#scripts/utils/schema-validator'
import { validateConfig } from '@atlas-composer/specification'

interface ValidationResults {
  errors: string[]
  warnings: string[]
  info: string[]
}

interface ValidationSummary extends ValidationResults {
  atlas: string
  success: boolean
  hasWarnings: boolean
}

interface GeoJSONFeature {
  type: 'Feature'
  id: string
  properties: {
    code?: string
    [key: string]: any
  }
  geometry: any
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

interface TopoJSONData {
  type: string
  objects?: {
    territories?: {
      geometries?: Array<{ id: string }>
    }
  }
}

type GeneratedData = GeoJSONFeatureCollection | TopoJSONData

async function loadBackendConfig(atlas: string): Promise<BackendConfig | null> {
  try {
    const { backend } = await loadConfig(atlas)
    return backend
  }
  catch {
    return null
  }
}

async function loadGeneratedData(atlas: string, resolution: string): Promise<GeneratedData | null> {
  try {
    const dataPath = resolve(process.cwd(), `src/public/data/${atlas}-territories-${resolution}.json`)
    const content = await readFile(dataPath, 'utf-8')
    return JSON.parse(content) as GeneratedData
  }
  catch {
    return null
  }
}
async function findAvailableResolutions(atlas: string): Promise<string[]> {
  const resolutions = ['10m', '50m', '110m']
  const available: string[] = []

  for (const resolution of resolutions) {
    const data = await loadGeneratedData(atlas, resolution)
    if (data) {
      available.push(resolution)
    }
  }

  return available
}

function extractBackendCodes(config: BackendConfig): string[] {
  return Object.values(config.territories).map(t => t.code)
}

function extractDataCodes(data: GeneratedData): string[] {
  if ('features' in data && data.type === 'FeatureCollection') {
    return data.features
      .map(f => f.properties?.code)
      .filter((code): code is string => typeof code === 'string')
  }
  else if (data.objects?.territories?.geometries) {
    return data.objects.territories.geometries.map(g => g.id)
  }
  return []
}

async function validatePresetFiles(atlas: string): Promise<string[]> {
  const errors: string[] = []
  const presets = await listPresetFiles(atlas)

  const defaults = presets.filter(preset => preset.isDefault).map(preset => preset.id)
  if (defaults.length !== 1) {
    errors.push(`Atlas has ${defaults.length} default presets, expected 1${defaults.length > 0 ? `: ${defaults.join(', ')}` : ''}`)
  }

  for (const preset of presets) {
    const file = relative(process.cwd(), preset.path)
    if (!preset.id.startsWith(`${atlas}-`)) {
      errors.push(`Preset ${preset.id} does not start with ${atlas}-`)
    }
    const expectedPath = `./presets/${atlas}/${preset.id}.json`
    if (preset.configPath !== expectedPath) {
      errors.push(`Preset ${preset.id} has configPath ${preset.configPath}, expected ${expectedPath}`)
    }

    let content: string
    try {
      content = await readFile(preset.path, 'utf-8')
    }
    catch {
      errors.push(`Preset file not found: ${preset.id}: ${file}`)
      continue
    }

    let json: unknown
    try {
      json = JSON.parse(content)
    }
    catch (error) {
      errors.push(`Preset ${file} is not valid JSON: ${(error as Error).message}`)
      continue
    }
    if (preset.type !== 'composite-custom') {
      const fileId = (json as { id?: unknown }).id
      if (fileId !== preset.id) {
        errors.push(`Preset ${preset.id} has id ${JSON.stringify(fileId)} in ${file}`)
      }
      continue
    }

    const result = validateConfig(json)
    if (!result.valid) {
      const details = result.errors.map(error => `${error.path}: ${error.message}`).join('; ')
      errors.push(`Preset ${file} does not follow the specification: ${details}`)
    }
  }

  return errors
}

async function validatePresetDeclarations(atlases: string[]): Promise<string[]> {
  const declarations = new Map<string, string[]>()
  for (const atlas of atlases) {
    for (const preset of await listPresetFiles(atlas)) {
      const file = relative(process.cwd(), preset.path)
      declarations.set(file, [...declarations.get(file) ?? [], preset.id])
    }
  }

  const errors: string[] = []
  const presetsDir = resolve(process.cwd(), 'configs/presets')
  for (const entry of await readdir(presetsDir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue
    }
    const file = relative(process.cwd(), join(entry.parentPath, entry.name))
    const ids = declarations.get(file) ?? []
    if (ids.length === 0) {
      errors.push(`Preset file not declared in configs/atlas-registry.json: ${file}`)
    }
    else if (ids.length > 1) {
      errors.push(`Preset file declared by several presets: ${file}: ${ids.join(', ')}`)
    }
  }
  return errors
}

async function validateAtlas(atlas: string): Promise<ValidationSummary> {
  logger.section(`Validating: ${atlas}`)

  const results: ValidationResults = {
    errors: [],
    warnings: [],
    info: [],
  }

  const backendConfig = await loadBackendConfig(atlas)
  if (!backendConfig) {
    results.errors.push(`Atlas config not found in registry`)
  }
  else {
    const territoryCount = Object.keys(backendConfig.territories).length
    const isWildcard = territoryCount === 0
    if (isWildcard) {
      results.info.push(`Atlas config found: wildcard atlas (territories loaded dynamically)`)
    }
    else {
      results.info.push(`Atlas config found: ${territoryCount} territory definitions`)
    }
  }

  results.errors.push(...await validatePresetFiles(atlas))

  const availableResolutions = await findAvailableResolutions(atlas)
  if (availableResolutions.length === 0) {
    results.warnings.push(`No generated data found for any resolution (run: pnpm geodata:prepare ${atlas})`)
  }
  else {
    results.info.push(`Available resolutions: ${availableResolutions.join(', ')}`)

    for (const resolution of availableResolutions) {
      const generatedData = await loadGeneratedData(atlas, resolution)
      if (generatedData) {
        const dataFormat = generatedData.type
        let featureCount = 0
        if (dataFormat === 'FeatureCollection' && 'features' in generatedData) {
          featureCount = generatedData.features.length
        }
        else if ('objects' in generatedData && generatedData.objects?.territories?.geometries) {
          featureCount = generatedData.objects.territories.geometries.length
        }
        results.info.push(`  ${resolution}: ${dataFormat} with ${featureCount} features`)

        if (backendConfig && Object.keys(backendConfig.territories).length > 0) {
          const backendCodes = extractBackendCodes(backendConfig)
          const dataCodes = extractDataCodes(generatedData)

          const missingInData = backendCodes.filter(code => !dataCodes.includes(code))
          if (missingInData.length > 0) {
            results.errors.push(`  ${resolution}: Territories in atlas config but not in data: ${missingInData.join(', ')}`)
          }

          const orphanedInData = dataCodes.filter(code => !backendCodes.includes(code))
          if (orphanedInData.length > 0) {
            results.warnings.push(`  ${resolution}: Territories in data but not in atlas config: ${orphanedInData.join(', ')}`)
          }

          if (missingInData.length === 0 && orphanedInData.length === 0) {
            results.info.push(`  ${resolution}: ✓ Atlas config and data are in sync (${backendCodes.length} territories)`)
          }
        }
        else if (backendConfig) {
          const dataCodes = extractDataCodes(generatedData)
          results.info.push(`  ${resolution}: ✓ Wildcard atlas with ${dataCodes.length} territories loaded`)
        }
      }
    }
  }

  results.info.forEach((msg) => {
    logger.success(msg)
  })

  results.warnings.forEach((msg) => {
    logger.warning(msg)
  })

  results.errors.forEach((msg) => {
    logger.error(msg)
  })

  logger.newline()

  return {
    atlas,
    success: results.errors.length === 0,
    hasWarnings: results.warnings.length > 0,
    ...results,
  }
}

async function listAvailableAtlases(): Promise<string[]> {
  return await listConfigs()
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help') {
    logger.log('Usage: pnpm geodata:validate <atlas|--all>')
    logger.log('\nExamples:')
    logger.log('  pnpm geodata:validate portugal')
    logger.log('  pnpm geodata:validate france')
    logger.log('  pnpm geodata:validate --all')
    return
  }

  if (args[0] === '--all') {
    const atlases = await listAvailableAtlases()
    logger.section(`Validating all atlases (${atlases.length})`)
    logger.newline()

    const results: ValidationSummary[] = []
    for (const atlas of atlases) {
      const result = await validateAtlas(atlas)
      results.push(result)
    }

    logger.section('Validating: configs/atlas-registry.json')
    const registryErrors = await validateRegistrySchema(await loadRegistry())
    registryErrors.forEach((msg) => {
      logger.error(msg)
    })
    if (registryErrors.length === 0) {
      logger.success('The registry matches configs/schemas/atlas-registry.schema.json')
    }
    logger.newline()

    logger.section('Validating: configs/presets')
    const declarationErrors = await validatePresetDeclarations(atlases)
    declarationErrors.forEach((msg) => {
      logger.error(msg)
    })
    if (declarationErrors.length === 0) {
      logger.success('Each preset file is declared once in the registry')
    }
    logger.newline()

    logger.section('Summary')
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    const warnings = results.filter(r => r.hasWarnings)

    logger.success(`${successful.length} valid`)
    if (warnings.length > 0) {
      logger.warning(`${warnings.length} with warnings`)
    }
    if (failed.length > 0) {
      logger.error(`${failed.length} with errors`)
      failed.forEach((r) => {
        logger.log(`  - ${r.atlas}`)
      })
      process.exitCode = 1
    }
    if (registryErrors.length > 0) {
      logger.error(`configs/atlas-registry.json with ${registryErrors.length} errors`)
      process.exitCode = 1
    }
    if (declarationErrors.length > 0) {
      logger.error(`configs/presets with ${declarationErrors.length} errors`)
      process.exitCode = 1
    }
  }
  else {
    const atlas = args[0]
    if (atlas && !(await validateAtlas(atlas)).success) {
      process.exitCode = 1
    }
  }
}

main().catch((error: Error) => {
  logger.error(`${error.message}`)
  if (process.env.DEBUG) {
    console.error(error)
  }
  process.exit(1)
})
