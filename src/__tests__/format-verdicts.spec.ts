import type { AtlasId } from '@/types/branded'
import { readdirSync, readFileSync } from 'node:fs'
import { ConfigValidationError, ProjectionLoader } from '@atlas-composer/projection-loader'
import { d3ProjectionFactories } from '@atlas-composer/projection-loader/helpers'
import { validateConfig } from '@atlas-composer/specification'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadAtlasFromConfigs } from '@/__tests__/test-utils'
import { getAtlasConfig } from '@/core/atlases/registry'
import { readCompositeConfig } from '@/core/presets'
import { DEFAULT_CANVAS_DIMENSIONS } from '@/core/projections/defaults'

function readFixtures(directory: string) {
  return readdirSync(directory).map(file => ({
    file,
    raw: JSON.parse(readFileSync(`${directory}/${file}`, 'utf8')),
  }))
}

function context(atlasId: AtlasId) {
  return { atlasConfig: getAtlasConfig(atlasId), canvasDimensions: DEFAULT_CANVAS_DIMENSIONS }
}

const formatFixtures = (['valid', 'invalid'] as const).flatMap(verdict =>
  readFixtures(`packages/specification/__tests__/fixtures/${verdict}`).map(fixture => ({ ...fixture, valid: verdict === 'valid' })))

// Files exported by earlier versions of the application, and written by hand from them
const deprecatedFixtures = readFixtures('src/__tests__/fixtures/exports')

const loader = new ProjectionLoader()
loader.registerAll(d3ProjectionFactories)

function loadWithLoader(raw: unknown) {
  return () => loader.loadFromJSON(JSON.stringify(raw), DEFAULT_CANVAS_DIMENSIONS)
}

beforeAll(async () => {
  await loadAtlasFromConfigs('france' as AtlasId)
  await loadAtlasFromConfigs('portugal' as AtlasId)
})

describe.each(formatFixtures)('format fixture $file', ({ raw, valid }) => {
  it(`is ${valid ? 'accepted' : 'refused'} by validateConfig, by the reader and by the loader`, () => {
    expect(validateConfig(raw).valid).toBe(valid)
    expect(readCompositeConfig(raw, context('france' as AtlasId)).ok).toBe(valid)
    if (valid)
      expect(loadWithLoader(raw)).not.toThrow()
    else
      expect(loadWithLoader(raw)).toThrow(ConfigValidationError)
  })
})

describe.each(deprecatedFixtures)('deprecated fixture $file', ({ raw }) => {
  it('is refused by validateConfig and by the loader, and accepted by the reader', () => {
    expect(validateConfig(raw).valid).toBe(false)
    expect(loadWithLoader(raw)).toThrow(ConfigValidationError)
    expect(readCompositeConfig(raw, context(raw.metadata.atlasId))).toMatchObject({ ok: true })
  })
})
