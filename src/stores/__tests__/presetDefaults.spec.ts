import type { TerritoryCode } from '@/types'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { DEFAULT_REFERENCE_SCALE } from '@atlas-composer/specification'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CANVAS_DIMENSIONS } from '@/core/projections/defaults'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'

const GUADELOUPE = 'FR-GP' as TerritoryCode

const guadeloupe: ProjectionParameters = {
  projectionId: 'mercator',
  translateOffset: [100, 50],
  scaleMultiplier: 1.5,
  rotate: [61, -16, 0],
}

describe('presetDefaults store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has no preset values when created', () => {
    expect(usePresetDefaultsStore().presetParameters).toEqual({})
  })

  it('compares a territory with the stored preset values, position included', () => {
    const store = usePresetDefaultsStore()
    store.storePresetDefaults({ [GUADELOUPE]: guadeloupe })

    expect(store.territoryDiffersFromPreset(GUADELOUPE, { ...guadeloupe })).toBe(false)
    expect(store.territoryDiffersFromPreset(GUADELOUPE, { ...guadeloupe, translateOffset: [0, 0] })).toBe(true)
    expect(store.territoryDiffersFromPreset(GUADELOUPE, { projectionId: 'mercator', rotate: [61, -16, 0] })).toBe(true)
  })

  it('compares a canvas with the default canvas when no canvas of a preset is stored', () => {
    const store = usePresetDefaultsStore()
    const defaultCanvas = { referenceScale: DEFAULT_REFERENCE_SCALE, dimensions: DEFAULT_CANVAS_DIMENSIONS }

    expect(store.referenceCanvas()).toEqual(defaultCanvas)
    expect(store.canvasDiffersFromPreset(defaultCanvas)).toBe(false)
    expect(store.canvasDiffersFromPreset({ ...defaultCanvas, referenceScale: DEFAULT_REFERENCE_SCALE + 50 })).toBe(true)
  })

  it('starts empty with a new Pinia instance', () => {
    usePresetDefaultsStore().storePresetDefaults({ [GUADELOUPE]: guadeloupe })
    setActivePinia(createPinia())

    expect(usePresetDefaultsStore().presetParameters).toEqual({})
  })
})
