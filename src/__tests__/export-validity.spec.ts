import type { ExportedCompositeConfig } from '@/types/export-config'
import { readFileSync } from 'node:fs'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { describe, expect, it, vi } from 'vitest'
import { importIntoApplication } from '@/__tests__/composite-utils'
import { readPresetFiles } from '@/__tests__/test-utils'

// The import modal requires the composite-custom view, which the usa atlas does not declare
vi.mock('@/core/atlases/registry', async importOriginal => ({
  ...await importOriginal<typeof import('@/core/atlases/registry')>(),
  getDefaultViewMode: vi.fn(() => 'composite-custom'),
}))

function readSchema(name: string) {
  return JSON.parse(readFileSync(`packages/specification/schemas/${name}.schema.json`, 'utf8'))
}

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)
ajv.addSchema(readSchema('definitions'))
const validate = ajv.compile(readSchema('composite-projection'))

const presets = readPresetFiles()
  .filter(preset => preset.type === 'composite-custom')
  .map(preset => ({ ...preset, config: JSON.parse(preset.json) as ExportedCompositeConfig }))

describe.each(presets)('export of $id', ({ config }) => {
  it('refuses the projectionId parameter of each territory', async () => {
    const application = await importIntoApplication(config)
    const exported = JSON.parse(JSON.stringify(application.exportToJSON()))

    validate(exported)

    expect(validate.errors).toEqual(config.territories.map((_, index) => expect.objectContaining({
      instancePath: `/territories/${index}/projection/parameters`,
      keyword: 'additionalProperties',
      params: { additionalProperty: 'projectionId' },
    })))
  })
})
