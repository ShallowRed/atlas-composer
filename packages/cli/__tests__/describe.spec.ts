// @vitest-environment node
import type { NeutralComposite } from '@atlas-composer/specification'
import { execFileSync } from 'node:child_process'
import { getPreset } from '@atlas-composer/preset-library'
import { describeComposite } from '@atlas-composer/projection-loader/neutral'
import { describe, expect, it } from 'vitest'

const CLI = 'packages/cli/dist/cli.js'

function run(args: string[]): string {
  return execFileSync('node', [CLI, ...args], { encoding: 'utf8', stdio: 'pipe' })
}

function failureOf(args: string[]): string {
  try {
    run(args)
  }
  catch (error) {
    const { status, stderr } = error as { status: number, stderr: string }
    expect(status).toBe(1)
    return stderr
  }
  throw new Error(`atlas-composer ${args.join(' ')} exits with the code 0`)
}

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
