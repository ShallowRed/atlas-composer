import type { AtlasId, ProjectionId, TerritoryCode } from '@/types/branded'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openView, startApplication } from '@/__tests__/composite-utils'
import { useTerritoryData } from '@/composables/useTerritoryData'
import { parameterRegistry } from '@/core/parameters'
import { useAtlasStore } from '@/stores/atlas'
import { useCompositionStore } from '@/stores/composition'
import { useParameterStore } from '@/stores/parameters'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'
import { useViewStore } from '@/stores/view'
import { createPresetId } from '@/types/branded'

const FRANCE = 'france' as AtlasId

// The comparison of the reset button of all territories, as TerritoriesControl.vue computes it
function territoriesDifferFromPreset(): boolean {
  const presetDefaults = usePresetDefaultsStore()
  if (!presetDefaults.hasPresetDefaults) {
    return false
  }

  const viewStore = useViewStore()
  if (viewStore.viewMode === 'composite-custom') {
    const presetCodes = Object.keys(presetDefaults.territoryDefaults!.projections)
    const activeCodes = viewStore.activeTerritoryCodes
    if (presetCodes.length !== activeCodes.size || presetCodes.some(code => !activeCodes.has(code as TerritoryCode))) {
      return true
    }
  }

  const parameterStore = useParameterStore()
  const territoryParameters = Object.fromEntries(useAtlasStore().atlasService.getAllTerritories()
    .map(({ code }) => [code, parameterStore.getTerritoryParameters(code as TerritoryCode)] as const)
    .filter(([, parameters]) => Object.keys(parameters).length > 0))
  const { translations, scales, projections } = useTerritoryData()

  return presetDefaults.hasDivergingParameters(translations.value, scales.value, territoryParameters, projections.value)
}

function displayedCodes(): TerritoryCode[] {
  return useTerritoryData().territories.value.map(({ code }) => code as TerritoryCode)
}

function codeOutsidePreset(): TerritoryCode {
  const presetCodes = Object.keys(usePresetDefaultsStore().territoryDefaults!.projections)
  const code = useAtlasStore().atlasService.getAllTerritories().map(t => t.code).find(c => !presetCodes.includes(c))
  return code as TerritoryCode
}

async function openComposite() {
  await startApplication(FRANCE)
  await useCompositionStore().initializeAtlas()
}

async function openSplit() {
  await openComposite()
  await openView('split')
}

function changeRotation(code: TerritoryCode) {
  useParameterStore().setTerritoryParameters(code, { rotate: [12, 34, 0] })
}

describe('difference with the preset values', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('after the application of a preset', () => {
    it('shows no difference with the default composite-custom preset', async () => {
      await openComposite()

      expect(displayedCodes().length).toBeGreaterThan(0)
      expect(territoriesDifferFromPreset()).toBe(false)
    })

    it('shows no difference with a composite-custom preset applied after another', async () => {
      await openComposite()

      expect(await useCompositionStore().loadPreset({ presetId: createPresetId('france-proportional') })).toMatchObject({ ok: true })

      expect(territoriesDifferFromPreset()).toBe(false)
    })

    it('shows no difference with the split preset', async () => {
      await openSplit()

      expect(displayedCodes().length).toBeGreaterThan(0)
      expect(territoriesDifferFromPreset()).toBe(false)
    })
  })

  describe('after a reset', () => {
    it('shows no difference after the reset of a territory of the preset', async () => {
      await openComposite()
      const [code] = displayedCodes()
      changeRotation(code!)

      useCompositionStore().resetTerritoryToDefaults(code!)

      expect(territoriesDifferFromPreset()).toBe(false)
    })

    it.fails('shows no difference after the reset of a territory without preset values, removed from the composition', async () => {
      await openComposite()
      const code = codeOutsidePreset()
      useViewStore().addTerritoryToComposite(code)
      changeRotation(code)

      useCompositionStore().resetTerritoryToDefaults(code)
      useViewStore().removeTerritoryFromComposite(code)

      expect(territoriesDifferFromPreset()).toBe(false)
    })

    it('shows no difference after the reset of all territories in the composite-custom view', async () => {
      await openComposite()
      displayedCodes().forEach(changeRotation)

      useCompositionStore().resetTransforms()

      expect(territoriesDifferFromPreset()).toBe(false)
    })

    it.fails('shows no difference after the reset of all territories when a territory outside the preset is displayed', async () => {
      await openComposite()
      const code = codeOutsidePreset()
      useViewStore().addTerritoryToComposite(code)
      changeRotation(code)

      useCompositionStore().resetTransforms()

      expect(territoriesDifferFromPreset()).toBe(false)
    })

    it('shows no difference after the reset of all territories in the split view', async () => {
      await openSplit()
      displayedCodes().forEach(changeRotation)

      useCompositionStore().resetTransforms()

      expect(territoriesDifferFromPreset()).toBe(false)
    })
  })

  describe('after a change', () => {
    it.each(['composite-custom', 'split'] as const)('shows a difference after a change of a parameter in the %s view', async (view) => {
      await (view === 'split' ? openSplit() : openComposite())

      changeRotation(displayedCodes()[0]!)

      expect(territoriesDifferFromPreset()).toBe(true)
    })

    it.each(['composite-custom', 'split'] as const)('shows a difference after a change of projection in the %s view', async (view) => {
      await (view === 'split' ? openSplit() : openComposite())
      const [code] = displayedCodes()
      const projectionId = useParameterStore().getTerritoryProjection(code!) === 'mercator' ? 'albers' : 'mercator'

      useParameterStore().setTerritoryProjection(code!, projectionId as ProjectionId)

      expect(territoriesDifferFromPreset()).toBe(true)
    })

    it('shows a difference after a change of a key that the preset does not set', async () => {
      await openComposite()
      const [code] = displayedCodes()
      expect(usePresetDefaultsStore().presetParameters[code!]?.precision).toBeUndefined()

      useParameterStore().setTerritoryParameter(code!, 'precision', parameterRegistry.getDefaultValue('precision'))

      expect(territoriesDifferFromPreset()).toBe(true)
    })

    it('shows a difference after a change of the translation', async () => {
      await openComposite()

      useParameterStore().setTerritoryTranslation(displayedCodes()[0]!, 'x', 999)

      expect(territoriesDifferFromPreset()).toBe(true)
    })
  })

  describe('after an addition to the composition', () => {
    it('shows a difference by the set of active territories', async () => {
      await openComposite()

      useViewStore().addTerritoryToComposite(codeOutsidePreset())

      expect(territoriesDifferFromPreset()).toBe(true)
    })
  })
})
