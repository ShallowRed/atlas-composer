// @vitest-environment node
import type { NeutralComposite } from '@atlas-composer/specification'
import { getPreset } from '@atlas-composer/preset-library'
import { describeComposite } from '@atlas-composer/projection-loader/neutral'
import { describe, expect, it } from 'vitest'
import { failureOf, run } from './cli'

describe('atlas-composer describe', () => {
  it('writes the neutral description of a preset to the standard output', async () => {
    const description: NeutralComposite = JSON.parse(run(['describe', 'portugal-standard']))

    expect(description).toEqual(describeComposite((await getPreset('portugal-standard'))!))
  })

  it('writes the same description for the file of the preset, at any resolution', () => {
    const fromFile = run(['describe', 'configs/presets/portugal/portugal-standard.json', '--resolution', '10m'])

    expect(fromFile).toBe(run(['describe', 'portugal-standard']))
  })

  it('refuses --data and --out', () => {
    expect(failureOf(['describe', 'portugal-standard', '--data', 'features.json'])).toContain('describe reads no geometry')
    expect(failureOf(['describe', 'portugal-standard', '--out', 'out.json'])).toContain('describe writes to the standard output')
  })

  it('names the describe command when the preset has another type', () => {
    expect(failureOf(['describe', 'france-unified'])).toContain('describe reads a composite-custom preset')
  })
})
