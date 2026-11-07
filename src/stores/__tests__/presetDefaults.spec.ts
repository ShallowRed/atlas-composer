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
    expect(usePresetDefaultsStore().hasPresetDefaults).toBe(false)
  })

  it('gives the stored defaults of a territory', () => {
    const store = usePresetDefaultsStore()
    store.storePresetDefaults(defaults, { [GUADELOUPE]: { rotate: [61, -16, 0] } })

    expect(store.hasPresetDefaults).toBe(true)
    expect(store.getPresetDefaultsForTerritory(GUADELOUPE)).toEqual({
      projection: 'mercator',
      translation: { x: 100, y: 50 },
      scale: 1.5,
      parameters: { rotate: [61, -16, 0] },
    })
  })

  it('starts empty with a new Pinia instance', () => {
    usePresetDefaultsStore().storePresetDefaults(defaults, {})
    setActivePinia(createPinia())

    expect(usePresetDefaultsStore().hasPresetDefaults).toBe(false)
  })
})
