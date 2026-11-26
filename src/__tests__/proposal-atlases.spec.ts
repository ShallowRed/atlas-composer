import type { CompositionState } from '@/core/presets/composition-state'
import type { ProposedTerritory } from '@/core/territories/proposal'
import type { AtlasId, TerritoryCode } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { readFileSync } from 'node:fs'
import { validateConfig } from '@atlas-composer/specification'
import { geoArea, geoPath } from 'd3-geo'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadAtlasFromConfigs, readAtlasContours, readPresetFiles } from '@/__tests__/test-utils'
import { getAtlasConfig } from '@/core/atlases/registry'
import { parameterRegistry, REFERENCE_SCALE_CONTROL, roundToFormat } from '@/core/parameters'
import { rectFromFrame, subProjectionAnchor } from '@/core/positioning'
import { compositionStateFromConfig } from '@/core/presets/composition-state'
import { PROPOSED_PROJECTION_IDS } from '@/core/projections/defaults'
import { projectionRegistry } from '@/core/projections/registry'
import { ARRANGEMENTS, proposeComposition, SCALE_MODES } from '@/core/territories/proposal'
import { CompositeExportService } from '@/services/export/composite-export-service'
import { CompositeImportService } from '@/services/export/composite-import-service'
import { CompositeProjection } from '@/services/projection/composite-projection'

const canvas = { width: 960, height: 500 }
const HALF_PIXEL = 0.5

// Each atlas of the registry that has the custom composite view
const atlasIds = [...new Set(readPresetFiles().filter(preset => preset.type === 'composite-custom').map(preset => preset.atlasId))]

// The territories at 10m, as the application loads them: the islands of the brazil atlas have no polygon at 50m
function proposedTerritories(atlasId: AtlasId): ProposedTerritory[] {
  const contours = readAtlasContours(atlasId, '10m')
  return getAtlasConfig(atlasId).compositeTerritories!.territories.map(({ code, center, bounds }) => ({
    code: code as TerritoryCode,
    geometry: contours.features.find(feature => feature.properties.code === code)!,
    center,
    band: [bounds![0][1], bounds![1][1]],
  }))
}

function compositeOf(atlasId: AtlasId, { territoryParameters, activeTerritories, canvas: composition }: CompositionState) {
  const provider = {
    getEffectiveParameters: (code: TerritoryCode) => territoryParameters[code]!,
    getExportableParameters: (code: TerritoryCode) => territoryParameters[code]!,
  }
  const active = new Set(activeTerritories)
  const composite = new CompositeProjection(getAtlasConfig(atlasId).compositeTerritories!, provider, { getActiveTerritoryCodes: () => active }, composition!.referenceScale)
  composite.build(canvas.width, canvas.height)
  return { composite, provider }
}

function frameOf(parameters: ProjectionParameters) {
  return rectFromFrame(parameters.pixelClipExtent!, subProjectionAnchor(canvas, parameters.translateOffset!))
}

// A proposed state that the application draws as it is: valid parameters, values that their field shows without loss,
// frames inside the canvas that hold the geometry of their territory and do not overlap
function expectReadableComposition(atlasId: AtlasId, territories: ProposedTerritory[], state: CompositionState) {
  const { composite } = compositeOf(atlasId, state)
  const referenceScale = state.canvas!.referenceScale
  expect(referenceScale).toBeGreaterThanOrEqual(REFERENCE_SCALE_CONTROL.domain.min)
  expect(roundToFormat(referenceScale, REFERENCE_SCALE_CONTROL.format)).toBe(referenceScale)

  const frames = state.activeTerritories.map((code) => {
    const parameters = state.territoryParameters[code]!
    const family = projectionRegistry.get(parameters.projectionId!)!.family
    const { projectionId, ...rest } = parameters
    expect(parameterRegistry.validateParameters(rest, family), code).toEqual([])

    expect(roundToFormat(parameters.scaleMultiplier!, parameterRegistry.getAxisControls('scaleMultiplier', family)![0]!.format)).toBe(parameters.scaleMultiplier)
    for (const key of ['center', 'rotate', 'parallels', 'translateOffset', 'pixelClipExtent']) {
      const controls = parameterRegistry.getAxisControls(key, family)
      for (const [index, value] of [...(parameters[key] ?? [])].entries()) {
        expect(roundToFormat(value, controls![index]!.format), `${code} ${key}`).toBe(value)
      }
    }

    const frame = frameOf(parameters)
    expect(frame.left).toBeGreaterThanOrEqual(-1e-9)
    expect(frame.top).toBeGreaterThanOrEqual(-1e-9)
    expect(frame.right).toBeLessThanOrEqual(canvas.width + 1e-9)
    expect(frame.bottom).toBeLessThanOrEqual(canvas.height + 1e-9)

    const geometry = territories.find(territory => territory.code === code)!.geometry
    const [[x0, y0], [x1, y1]] = geoPath(composite.getSubProjectionData(code)!.projection.clipExtent(null)).bounds(geometry)
    expect(x0, code).toBeGreaterThanOrEqual(frame.left - HALF_PIXEL)
    expect(y0, code).toBeGreaterThanOrEqual(frame.top - HALF_PIXEL)
    expect(x1, code).toBeLessThanOrEqual(frame.right + HALF_PIXEL)
    expect(y1, code).toBeLessThanOrEqual(frame.bottom + HALF_PIXEL)
    return frame
  })

  for (const [index, a] of frames.entries()) {
    for (const b of frames.slice(index + 1)) {
      expect(a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom).toBe(false)
    }
  }
}

describe.each(atlasIds)('proposal on the atlas %s', (atlasId) => {
  let territories: ProposedTerritory[]

  beforeAll(async () => {
    await loadAtlasFromConfigs(atlasId)
    territories = proposedTerritories(atlasId)
  })

  it('composes each territory alone', () => {
    for (const territory of territories) {
      expectReadableComposition(atlasId, [territory], proposeComposition([territory], { arrangement: 'insets-right', scaleMode: 'readable', canvas }).state)
    }
  })

  it.each(ARRANGEMENTS.flatMap(arrangement => SCALE_MODES.map(scaleMode => ({ arrangement, scaleMode }))))('composes every territory, $arrangement, $scaleMode', (options) => {
    expectReadableComposition(atlasId, territories, proposeComposition(territories, { ...options, canvas }).state)
  })

  it('puts first the territory of largest spherical area', () => {
    const [main] = proposeComposition(territories, { arrangement: 'insets-right', scaleMode: 'readable', canvas }).state.activeTerritories
    const largest = territories.reduce((a, b) => geoArea(b.geometry) > geoArea(a.geometry) ? b : a)

    expect(main).toBe(largest.code)
  })

  it('exports a file that validateConfig accepts, whose import gives back the proposed parameters', () => {
    const { state } = proposeComposition(territories, { arrangement: 'insets-right', scaleMode: 'readable', canvas })
    const { composite, provider } = compositeOf(atlasId, state)
    const exported = JSON.parse(JSON.stringify(CompositeExportService.exportToJSON(composite, atlasId, atlasId, provider, state.canvas!.referenceScale, canvas)))

    expect(validateConfig(exported)).toMatchObject({ valid: true, errors: [] })

    const imported = CompositeImportService.importFromJSON(JSON.stringify(exported), { atlasConfig: getAtlasConfig(atlasId), canvasDimensions: canvas })
    expect(imported.ok).toBe(true)
    const { territoryParameters } = compositionStateFromConfig(imported.ok ? imported.value : exported)
    for (const code of state.activeTerritories) {
      expect(territoryParameters[code], code).toMatchObject(JSON.parse(JSON.stringify(state.territoryParameters[code])))
    }
  })
})

describe('proposal on the atlas usa', () => {
  it('takes the contiguous states as main territory, though the bounds of the Aleutians cross the antimeridian', async () => {
    await loadAtlasFromConfigs('usa' as AtlasId)
    const [main] = proposeComposition(proposedTerritories('usa' as AtlasId), { arrangement: 'insets-right', scaleMode: 'readable', canvas }).state.activeTerritories

    expect(main).toBe('US-CONT')
  })
})

describe.each(['fr', 'en'])('texts of the proposal in %s', (locale) => {
  const { proposal } = JSON.parse(readFileSync(`src/i18n/locales/${locale}.json`, 'utf8'))

  it('name each reason of a proposed projection, each arrangement and each scale', () => {
    for (const reason of Object.keys(PROPOSED_PROJECTION_IDS)) {
      expect(proposal.reasons[reason], reason).toEqual(expect.any(String))
    }
    for (const arrangement of ARRANGEMENTS) {
      expect(proposal.arrangements[arrangement], arrangement).toEqual(expect.any(String))
    }
    for (const scaleMode of SCALE_MODES) {
      expect(proposal.scaleModes[scaleMode], scaleMode).toEqual(expect.any(String))
    }
  })
})
