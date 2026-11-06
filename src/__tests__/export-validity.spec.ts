import { validateConfig } from '@atlas-composer/specification'
import { describe, expect, it, vi } from 'vitest'
import { importIntoApplication } from '@/__tests__/composite-utils'
import { readPresetFiles } from '@/__tests__/test-utils'

// The import modal requires the composite-custom view, which the usa atlas does not declare
vi.mock('@/core/atlases/registry', async importOriginal => ({
  ...await importOriginal<typeof import('@/core/atlases/registry')>(),
  getDefaultViewMode: vi.fn(() => 'composite-custom'),
}))

const presets = readPresetFiles().filter(preset => preset.type === 'composite-custom')

describe.each(presets)('export of $id', ({ json }) => {
  it('passes validateConfig', async () => {
    const application = await importIntoApplication(json)
    const exported = JSON.parse(JSON.stringify(application.exportToJSON()))

    expect(validateConfig(exported)).toMatchObject({ valid: true, errors: [] })
  })
})
