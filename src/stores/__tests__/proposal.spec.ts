import type { AtlasId, TerritoryCode } from '@/types/branded'
import type { Territory } from '@/types/territory'
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { openView, startApplication } from '@/__tests__/composite-utils'
import { readAtlasContours, withSetup } from '@/__tests__/test-utils'
import { useTerritoryTransforms } from '@/composables/useTerritoryTransforms'
import { rectFromFrame, subProjectionAnchor } from '@/core/positioning'
import { freeCell } from '@/core/territories/proposal'
import { useCompositionStore } from '@/stores/composition'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'
import { createPresetId } from '@/types/branded'

const JAPAN = 'japan' as AtlasId
const MAIN = 'JP-MAIN' as TerritoryCode
const HOKKAIDO = 'JP-01' as TerritoryCode
const RYUKYU = 'JP-RYU' as TerritoryCode
const OGASAWARA = 'JP-OGA' as TerritoryCode
const OPTIONS = { arrangement: 'insets-right', scaleMode: 'readable' } as const

// Japan in the custom composite view, with the contours of its territories, which the application reads from src/public/data
async function openJapan() {
  await startApplication(JAPAN)
  await useCompositionStore().initializeAtlas()
  await openView('composite-custom')
  useGeoDataStore().territoriesData = readAtlasContours(JAPAN).features.map(feature => ({
    code: feature.properties.code as TerritoryCode,
    name: feature.properties.code,
    area: 0,
    region: '',
    data: { type: 'FeatureCollection', features: [feature] },
  }) satisfies Territory)
}

async function propose(codes: TerritoryCode[] = [MAIN, RYUKYU]) {
  await openJapan()
  useCompositionStore().startProposal(codes, OPTIONS)
}

const differsFromReference = () => withSetup(useTerritoryTransforms).differsFromReference.value
const parametersOf = (code: TerritoryCode) => useParameterStore().getTerritoryParameters(code)
// The rectangle of the canvas that the frame of a territory covers, at some parameters
function rectOf(parameters: { pixelClipExtent?: [number, number, number, number], translateOffset?: [number, number] }) {
  return rectFromFrame(parameters.pixelClipExtent!, subProjectionAnchor(useProjectionStore().canvasDimensions!, parameters.translateOffset!))
}

function overlaps(code: TerritoryCode, others: Array<Parameters<typeof rectOf>[0]>): boolean {
  const a = rectOf(parametersOf(code))
  return others.map(rectOf).some(b => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom)
}

const activeExcept = (code: TerritoryCode) => [...useViewStore().activeTerritoryCodes].filter(other => other !== code).map(parametersOf)

describe('a proposal as the reference of the reset', () => {
  it('becomes the reference, with its territories active and no difference', async () => {
    await propose()
    const presetDefaults = usePresetDefaultsStore()

    expect(presetDefaults.proposal).toMatchObject({ codes: [MAIN, RYUKYU], additions: [], ...OPTIONS })
    expect(Object.keys(presetDefaults.presetParameters)).toEqual([MAIN, RYUKYU])
    expect([...useViewStore().activeTerritoryCodes]).toEqual([MAIN, RYUKYU])
    expect(differsFromReference()).toBe(false)
  })

  it('differs after a change of a territory, and the reset gives the proposal back', async () => {
    await propose()
    const proposed = structuredClone(parametersOf(RYUKYU))
    useParameterStore().setTerritoryParameter(RYUKYU, 'scaleMultiplier', 3)

    expect(differsFromReference()).toBe(true)

    useCompositionStore().resetTransforms()

    expect(parametersOf(RYUKYU)).toMatchObject(proposed)
    expect(differsFromReference()).toBe(false)
  })

  it('composes again the composed and the added territories on a change of arrangement, with no addition left', async () => {
    await propose()
    const composition = useCompositionStore()
    composition.addTerritoryToComposite(OGASAWARA)
    const { codes, additions } = usePresetDefaultsStore().proposal!
    composition.startProposal([...codes, ...additions], { ...OPTIONS, arrangement: 'insets-bottom' })

    expect(usePresetDefaultsStore().proposal).toMatchObject({ codes: [MAIN, RYUKYU, OGASAWARA], additions: [], arrangement: 'insets-bottom' })
    expect(differsFromReference()).toBe(false)
  })

  it('keeps the global parameters', async () => {
    await openJapan()
    useParameterStore().setGlobalParameter('parallels', [30, 40])
    useCompositionStore().startProposal([MAIN, RYUKYU], OPTIONS)

    expect(useParameterStore().globalParameters.parallels).toEqual([30, 40])
  })
})

describe('a territory checked after a proposal', () => {
  it('goes in a free cell, enters the proposal and the reference, and keeps the composition equal to the reference', async () => {
    await propose()
    useCompositionStore().addTerritoryToComposite(OGASAWARA)
    const presetDefaults = usePresetDefaultsStore()

    expect(presetDefaults.proposal!.additions).toEqual([OGASAWARA])
    expect(presetDefaults.proposal!.reasons[OGASAWARA]).toBeDefined()
    expect(presetDefaults.presetParameters[OGASAWARA]).toEqual(parametersOf(OGASAWARA))
    expect(overlaps(OGASAWARA, activeExcept(OGASAWARA))).toBe(false)
    expect(differsFromReference()).toBe(false)
  })

  it('goes in a free cell that avoids the current position of a moved territory', async () => {
    await propose()
    const canvas = useProjectionStore().canvasDimensions!
    // Moves the Ryukyu islands to the top cell of the right column, where the first addition would go
    const top = freeCell([], 2, { arrangement: 'insets-right', canvas })
    const [left, upper] = parametersOf(RYUKYU).pixelClipExtent!
    const [x, y] = subProjectionAnchor(canvas, [0, 0])
    useParameterStore().setTerritoryTranslation(RYUKYU, 'x', top.left - left - x)
    useParameterStore().setTerritoryTranslation(RYUKYU, 'y', top.top - upper - y)
    useCompositionStore().addTerritoryToComposite(OGASAWARA)

    expect(usePresetDefaultsStore().proposal!.additions).toEqual([OGASAWARA])
    expect(overlaps(OGASAWARA, activeExcept(OGASAWARA))).toBe(false)
  })

  it('avoids the reference position of an added territory unchecked since', async () => {
    await propose()
    const composition = useCompositionStore()
    composition.addTerritoryToComposite(OGASAWARA)
    useViewStore().removeTerritoryFromComposite(OGASAWARA)
    composition.addTerritoryToComposite(HOKKAIDO)

    expect(overlaps(HOKKAIDO, [usePresetDefaultsStore().presetParameters[OGASAWARA]!, ...activeExcept(HOKKAIDO)])).toBe(false)
  })

  it('goes in the first cell, over another territory, when no cell is free', async () => {
    await openJapan()
    // One territory fills the whole canvas
    useCompositionStore().startProposal([MAIN], OPTIONS)
    useCompositionStore().addTerritoryToComposite(OGASAWARA)

    expect(usePresetDefaultsStore().proposal!.additions).toEqual([OGASAWARA])
    const cell = freeCell([], 1, { arrangement: 'insets-right', canvas: useProjectionStore().canvasDimensions! })
    const rect = rectOf(parametersOf(OGASAWARA))
    for (const edge of ['left', 'top', 'right', 'bottom'] as const) {
      expect(rect[edge]).toBeCloseTo(cell[edge], 1)
    }
  })

  it('keeps its parameters when it was unchecked, without a second entry in the additions', async () => {
    await propose()
    const composition = useCompositionStore()
    composition.addTerritoryToComposite(OGASAWARA)
    useParameterStore().setTerritoryParameter(OGASAWARA, 'scaleMultiplier', 2)
    useViewStore().removeTerritoryFromComposite(OGASAWARA)
    composition.addTerritoryToComposite(OGASAWARA)

    expect(usePresetDefaultsStore().proposal!.additions).toEqual([OGASAWARA])
    expect(parametersOf(OGASAWARA).scaleMultiplier).toBe(2)
  })

  it('goes in a free cell after a reset of all territories, outside the reference', async () => {
    await propose()
    const composition = useCompositionStore()
    composition.resetTransforms()
    composition.addTerritoryToComposite(HOKKAIDO)

    expect(usePresetDefaultsStore().proposal!.additions).toEqual([HOKKAIDO])
    expect(overlaps(HOKKAIDO, activeExcept(HOKKAIDO))).toBe(false)
  })

  it('gets back the position of its addition on its own reset', async () => {
    await propose()
    const composition = useCompositionStore()
    composition.addTerritoryToComposite(OGASAWARA)
    const added = structuredClone(parametersOf(OGASAWARA))
    useParameterStore().setTerritoryTranslation(OGASAWARA, 'x', 0)
    composition.resetTerritoryToDefaults(OGASAWARA)

    expect(parametersOf(OGASAWARA)).toMatchObject(added)
  })
})

describe('a territory unchecked during a proposal', () => {
  it('leaves the proposal and the reference as they are', async () => {
    await propose()
    const before = JSON.parse(JSON.stringify({ proposal: usePresetDefaultsStore().proposal, reference: usePresetDefaultsStore().presetParameters }))
    useViewStore().removeTerritoryFromComposite(RYUKYU)

    expect({ proposal: usePresetDefaultsStore().proposal, reference: usePresetDefaultsStore().presetParameters }).toEqual(before)
  })
})

describe('the end of a proposal', () => {
  it('comes with a preset', async () => {
    await propose()
    const result = await useCompositionStore().loadPreset({ presetId: createPresetId('japan-standard') })

    expect(result.ok).toBe(true)
    expect(usePresetDefaultsStore().proposal).toBeNull()
  })

  it('comes with an imported file', async () => {
    await propose()
    const json = await readFile('configs/presets/japan/japan-standard.json', 'utf8')
    const composition = useCompositionStore()
    const result = await composition.importConfiguration(JSON.parse(json))

    expect(result.ok).toBe(true)
    expect(usePresetDefaultsStore().proposal).toBeNull()
  })

  it('comes with a change of view mode', async () => {
    await propose()
    await openView('split')

    expect(usePresetDefaultsStore().proposal).toBeNull()
  })

  it('comes with a change of atlas', async () => {
    await propose()
    await useCompositionStore().selectAtlas('france' as AtlasId)

    expect(usePresetDefaultsStore().proposal).toBeNull()
  })
})
