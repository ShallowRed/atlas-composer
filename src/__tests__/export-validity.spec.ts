import { validateConfig } from '@atlas-composer/specification'
import { describe, expect, it } from 'vitest'
import { importIntoApplication } from '@/__tests__/composite-utils'
import { readPresetFiles } from '@/__tests__/test-utils'

const presets = readPresetFiles().filter(preset => preset.type === 'composite-custom')

describe.each(presets)('export of $id', ({ json }) => {
  it('passes validateConfig', async () => {
    const application = await importIntoApplication(json)
    const exported = JSON.parse(JSON.stringify(application.exportToJSON()))

    expect(validateConfig(exported)).toMatchObject({ valid: true, errors: [] })
  })
})
