import { describe, expect, it } from 'vitest'
import { findPresetById } from '@/core/atlases/registry'
import { colorOf, EXAMPLES, legendEntries, NO_DATA_COLOR } from '@/core/examples'

const THRESHOLDS = [10, 100]
const COLORS = ['light', 'medium', 'dark']

describe('examples', () => {
  it.each(EXAMPLES.map(example => [example.id, example] as const))('%s draws a composite-custom preset of the registry with increasing thresholds and one more color than thresholds', (_id, example) => {
    expect(findPresetById(example.presetId)?.preset.type).toBe('composite-custom')
    expect(example.colors).toHaveLength(example.thresholds.length + 1)
    expect(example.thresholds.every((threshold, index) => index === 0 || threshold > example.thresholds[index - 1]!)).toBe(true)
  })
})

describe('colorOf', () => {
  it('gives the color of the class that starts at the highest threshold below the value', () => {
    expect([5, 10, 50, 100, 1000].map(value => colorOf(value, THRESHOLDS, COLORS)))
      .toEqual(['light', 'medium', 'medium', 'dark', 'dark'])
  })

  it('gives the no-data color to a missing value', () => {
    expect(colorOf(null, THRESHOLDS, COLORS)).toBe(NO_DATA_COLOR)
  })
})

describe('legendEntries', () => {
  it('bounds each class by its thresholds', () => {
    expect(legendEntries(THRESHOLDS, COLORS)).toEqual([
      { color: 'light', to: 10 },
      { color: 'medium', from: 10, to: 100 },
      { color: 'dark', from: 100 },
    ])
  })
})
