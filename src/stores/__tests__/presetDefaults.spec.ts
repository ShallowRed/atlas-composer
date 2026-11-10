import type { TerritoryDefaults } from '@/core/presets'
import type { ProjectionId, TerritoryCode } from '@/types'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'

const GUADELOUPE = 'FR-GP' as TerritoryCode

const defaults: TerritoryDefaults = {
  projections: { [GUADELOUPE]: 'mercator' as ProjectionId },
  translations: { [GUADELOUPE]: { x: 100, y: 50 } },
  scales: { [GUADELOUPE]: 1.5 },
}

describe('presetDefaults store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has no preset defaults when created', () => {
    expect(usePresetDefaultsStore().territoryDefaults).toBeNull()
  })

  it('compares a territory with the stored defaults', () => {
    const store = usePresetDefaultsStore()
    store.storePresetDefaults(defaults, { [GUADELOUPE]: { rotate: [61, -16, 0] } })

    expect(store.territoryDiffersFromPreset(GUADELOUPE, {
      projectionId: 'mercator',
      translateOffset: [100, 50],
      scaleMultiplier: 1.5,
      rotate: [61, -16, 0],
    })).toBe(false)
    expect(store.territoryDiffersFromPreset(GUADELOUPE, { projectionId: 'mercator', rotate: [61, -16, 0] })).toBe(true)
  })

  it('starts empty with a new Pinia instance', () => {
    usePresetDefaultsStore().storePresetDefaults(defaults, {})
    setActivePinia(createPinia())

    expect(usePresetDefaultsStore().territoryDefaults).toBeNull()
  })
})
