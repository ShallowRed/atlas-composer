import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { AtlasId, ProjectionId, TerritoryCode } from '@/types/branded'
import { readFile } from 'node:fs/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openView, startApplication } from '@/__tests__/composite-utils'
import { useTerritoryData } from '@/composables/useTerritoryData'
import { parameterRegistry } from '@/core/parameters'
import { FALLBACK_PROJECTION_ID } from '@/core/projections/defaults'
import { useAtlasStore } from '@/stores/atlas'
import { useCompositionStore } from '@/stores/composition'
import { useParameterStore } from '@/stores/parameters'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'
import { createPresetId } from '@/types/branded'

const FRANCE = 'france' as AtlasId
const PORTUGAL = 'portugal' as AtlasId
const PORTUGAL_STANDARD_CANVAS = { referenceScale: 4200, dimensions: { width: 960, height: 500 } }
const FRANCE_STANDARD_CANVAS = { referenceScale: 2700, dimensions: { width: 760, height: 500 } }
const METROPOLE = 'FR-MET' as TerritoryCode
const OMITTED_BY_SPLIT_PRESET = 'FR-BL' as TerritoryCode

function displayedCodes(): TerritoryCode[] {
  return useTerritoryData().territories.value.map(({ code }) => code as TerritoryCode)
}

function territoryDiffers(code: TerritoryCode): boolean {
  return usePresetDefaultsStore().territoryDiffersFromPreset(code, useParameterStore().getTerritoryParameters(code))
}

function territoriesDiffer(): boolean {
  const viewStore = useViewStore()
  const parameterStore = useParameterStore()
  return usePresetDefaultsStore().territoriesDifferFromPreset(
    Object.fromEntries(displayedCodes().map(code => [code, parameterStore.getTerritoryParameters(code)])),
    viewStore.activeTerritoryCodes,
    viewStore.viewMode === 'composite-custom',
  )
}

function globalDiffers(): boolean {
  return usePresetDefaultsStore().globalDiffersFromPreset(useParameterStore().globalEffectiveParameters)
}

function codeOutsidePreset(): TerritoryCode {
  const presetCodes = Object.keys(usePresetDefaultsStore().presetParameters)
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

async function openUnified() {
  await openComposite()
  await openView('unified')
}

async function openPortugal() {
  await startApplication(PORTUGAL)
  await useCompositionStore().initializeAtlas()
}

async function openFranceStandard() {
  await openComposite()
  await useCompositionStore().loadPreset({ presetId: createPresetId('france-standard') })
}

async function importFranceStandard() {
  await openComposite()
  const json = await readFile('configs/presets/france/france-standard.json', 'utf8')
  await useCompositionStore().importConfiguration(JSON.parse(json) as CompositeProjectionConfig)
}

function currentCanvas() {
  const { referenceScale, canvasDimensions } = useProjectionStore()
  if (referenceScale === undefined || canvasDimensions === undefined) {
    throw new Error('The projection store holds no canvas')
  }
  return { referenceScale, dimensions: canvasDimensions }
}

function canvasDiffers(): boolean {
  return usePresetDefaultsStore().canvasDiffersFromPreset(currentCanvas())
}

function atlasCodes(): TerritoryCode[] {
  return useAtlasStore().atlasService.getAllTerritories().map(({ code }) => code as TerritoryCode)
}

async function addOutsidePreset(): Promise<TerritoryCode> {
  await openComposite()
  const code = codeOutsidePreset()
  useCompositionStore().addTerritoryToComposite(code)
  return code
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
      expect(territoriesDiffer()).toBe(false)
      expect(displayedCodes().filter(territoryDiffers)).toEqual([])
    })

    it('shows no difference with a composite-custom preset applied after another', async () => {
      await openComposite()

      expect(await useCompositionStore().loadPreset({ presetId: createPresetId('france-proportional') })).toMatchObject({ ok: true })

      expect(territoriesDiffer()).toBe(false)
      expect(displayedCodes().filter(territoryDiffers)).toEqual([])
    })

    it('shows no difference with the split preset', async () => {
      await openSplit()

      expect(displayedCodes().length).toBeGreaterThan(0)
      expect(territoriesDiffer()).toBe(false)
      expect(displayedCodes().filter(territoryDiffers)).toEqual([])
    })

    it('shows no difference with the unified preset', async () => {
      await openUnified()

      expect(usePresetDefaultsStore().presetGlobalParameters).not.toBeNull()
      expect(globalDiffers()).toBe(false)
    })

    it('shows no difference after a rotation of the map followed by the choice of a preset', async () => {
      await openUnified()
      useParameterStore().setGlobalParameters({ rotate: [40, 10, 0] })

      expect(await useViewStore().loadViewPreset(createPresetId('france-unified'))).toMatchObject({ ok: true })

      expect(globalDiffers()).toBe(false)
    })

    it('shows no difference after a change of the scale multiplier followed by the split view and the unified view', async () => {
      await openUnified()
      useParameterStore().setGlobalParameter('scaleMultiplier', 2)

      await openView('split')
      await openView('unified')

      expect(globalDiffers()).toBe(false)
    })
  })

  describe('after a change of view', () => {
    it('leaves no parameter of the unified preset in the split view', async () => {
      await openUnified()
      const parameterStore = useParameterStore()
      expect(parameterStore.getEffectiveParameters().scale).toBeDefined()

      await openView('split')

      expect(atlasCodes().map(code => parameterStore.getEffectiveParameters(code)))
        .toEqual(atlasCodes().map(code => parameterStore.getTerritoryParameters(code)))
    })

    it('writes in the split view the preset values of each territory, and the fallback projection for a territory that the preset omits', async () => {
      await openComposite()
      const parameterStore = useParameterStore()
      atlasCodes().forEach(code => parameterStore.setTerritoryParameters(code, { scaleMultiplier: 3, center: [1, 2] }))

      await openView('split')

      const presetValues = usePresetDefaultsStore().presetParameters
      expect(Object.fromEntries(atlasCodes().map(code => [code, parameterStore.getTerritoryParameters(code)])))
        .toEqual(presetValues)
      expect(presetValues[METROPOLE]).toMatchObject({ projectionId: 'conic-conformal' })
      expect(parameterStore.getTerritoryParameters(OMITTED_BY_SPLIT_PRESET))
        .toEqual({ projectionId: FALLBACK_PROJECTION_ID, translateOffset: [0, 0], scaleMultiplier: 1 })
      expect(atlasCodes().filter(territoryDiffers)).toEqual([])
    })
  })

  describe('after a reset', () => {
    it('shows no difference after the reset of a territory of the preset', async () => {
      await openComposite()
      const [code] = displayedCodes()
      changeRotation(code!)

      useCompositionStore().resetTerritoryToDefaults(code!)

      expect(territoryDiffers(code!)).toBe(false)
      expect(territoriesDiffer()).toBe(false)
    })

    it('shows no difference after the reset of a territory without preset values', async () => {
      const code = await addOutsidePreset()
      changeRotation(code)

      useCompositionStore().resetTerritoryToDefaults(code)

      expect(territoryDiffers(code)).toBe(false)
    })

    it('shows no difference after the reset of all territories in the composite-custom view', async () => {
      await openComposite()
      displayedCodes().forEach(changeRotation)

      useCompositionStore().resetTransforms()

      expect(territoriesDiffer()).toBe(false)
    })

    it('shows no difference after the reset of all territories when a territory outside the preset is displayed', async () => {
      const code = await addOutsidePreset()
      changeRotation(code)

      useCompositionStore().resetTransforms()

      expect(territoriesDiffer()).toBe(false)
      expect(useParameterStore().getTerritoryParameters(code)).toEqual({ translateOffset: [0, 0], scaleMultiplier: 1 })
    })

    it('shows no difference after the reset of all territories in the split view', async () => {
      await openSplit()
      displayedCodes().forEach(changeRotation)

      useCompositionStore().resetTransforms()

      expect(territoriesDiffer()).toBe(false)
    })

    it('shows no difference after the reset of the global parameters', async () => {
      await openUnified()
      useParameterStore().setGlobalParameters({ rotate: [40, 10, 0] })
      useParameterStore().setGlobalParameter('scaleMultiplier', 2)

      useParameterStore().clearGlobalParameters()

      expect(globalDiffers()).toBe(false)
    })
  })

  describe('after a change', () => {
    it.each(['composite-custom', 'split'] as const)('shows a difference after a change of a parameter in the %s view', async (view) => {
      await (view === 'split' ? openSplit() : openComposite())
      const [code] = displayedCodes()

      changeRotation(code!)

      expect(territoryDiffers(code!)).toBe(true)
      expect(territoriesDiffer()).toBe(true)
    })

    it.each(['composite-custom', 'split'] as const)('shows a difference after a change of projection in the %s view', async (view) => {
      await (view === 'split' ? openSplit() : openComposite())
      const [code] = displayedCodes()
      const projectionId = useParameterStore().getTerritoryProjection(code!) === 'mercator' ? 'albers' : 'mercator'

      useParameterStore().setTerritoryProjection(code!, projectionId as ProjectionId)

      expect(territoryDiffers(code!)).toBe(true)
      expect(territoriesDiffer()).toBe(true)
    })

    it('shows a difference after a change of a key that the preset does not set', async () => {
      await openComposite()
      const [code] = displayedCodes()
      expect(usePresetDefaultsStore().presetParameters[code!]?.precision).toBeUndefined()

      useParameterStore().setTerritoryParameter(code!, 'precision', parameterRegistry.getDefaultValue('precision'))

      expect(territoryDiffers(code!)).toBe(true)
      expect(territoriesDiffer()).toBe(true)
    })

    it('shows a difference after a change of the translation', async () => {
      await openComposite()
      const [code] = displayedCodes()

      useParameterStore().setTerritoryTranslation(code!, 'x', 999)

      expect(territoryDiffers(code!)).toBe(true)
      expect(territoriesDiffer()).toBe(true)
    })

    it('shows no difference for a territory without preset values just after its addition', async () => {
      const code = await addOutsidePreset()

      expect(territoryDiffers(code)).toBe(false)
    })

    it('shows a difference after a change of a territory without preset values', async () => {
      const code = await addOutsidePreset()

      changeRotation(code)

      expect(territoryDiffers(code)).toBe(true)
    })

    it('shows a difference after a change of a global parameter', async () => {
      await openUnified()

      useParameterStore().setGlobalParameter('scaleMultiplier', 2)

      expect(globalDiffers()).toBe(true)
    })
  })

  describe('of the canvas', () => {
    it.each([
      ['the default preset of Portugal', openPortugal, PORTUGAL_STANDARD_CANVAS],
      ['the france-standard preset', openFranceStandard, FRANCE_STANDARD_CANVAS],
      ['the import of the france-standard file', importFranceStandard, FRANCE_STANDARD_CANVAS],
    ])('shows no difference after %s, and a difference after a change of each value', async (_name, open, canvas) => {
      await open()
      const projectionStore = useProjectionStore()

      expect(currentCanvas()).toEqual(canvas)
      expect(canvasDiffers()).toBe(false)

      projectionStore.referenceScale = canvas.referenceScale + 50
      expect(canvasDiffers()).toBe(true)

      projectionStore.referenceScale = canvas.referenceScale
      projectionStore.canvasDimensions = { ...canvas.dimensions, width: canvas.dimensions.width + 10 }
      expect(canvasDiffers()).toBe(true)

      projectionStore.canvasDimensions = { ...canvas.dimensions, height: canvas.dimensions.height + 10 }
      expect(canvasDiffers()).toBe(true)
    })

    it.each([
      ['the default preset of Portugal', openPortugal, PORTUGAL_STANDARD_CANVAS],
      ['the france-standard preset', openFranceStandard, FRANCE_STANDARD_CANVAS],
    ])('puts back the canvas of %s at a reset', async (_name, open, canvas) => {
      await open()
      const projectionStore = useProjectionStore()
      projectionStore.referenceScale = 1000
      projectionStore.canvasDimensions = { width: 1200, height: 800 }

      useCompositionStore().resetCanvas()

      expect(currentCanvas()).toEqual(canvas)
      expect(canvasDiffers()).toBe(false)
    })

    it('holds no canvas of the preset after a change of view', async () => {
      await openFranceStandard()

      await openView('split')

      expect(usePresetDefaultsStore().presetCanvas).toBeNull()
    })
  })

  describe('after an addition to the composition', () => {
    it('shows no difference for the added territory', async () => {
      const code = await addOutsidePreset()

      expect(displayedCodes()).toContain(code)
      expect(territoryDiffers(code)).toBe(false)
    })

    it('shows a difference by the set of active territories', async () => {
      await addOutsidePreset()

      expect(territoriesDiffer()).toBe(true)
    })
  })
})
