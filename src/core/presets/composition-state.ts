import type { CanvasDimensions, CompositeProjectionConfig, GeoBounds } from '@atlas-composer/specification'
import type { I18nValue } from '#types'
import type { TerritoryCode } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'
import type { TerritoryConfig } from '@/types/territory'

import { FALLBACK_PROJECTION_ID } from '@/core/projections/defaults'
import { referenceParameters } from '@/core/territories/territory-reset-service'
import { extractTerritoryParameters } from './converter'

// An element of the territories of a composite file; its parameters stay in the parameter store, under its code
export interface CompositionEntry {
  code: TerritoryCode
  name: I18nValue
  bounds?: GeoBounds
}

export interface CompositionState {
  territoryParameters: Record<TerritoryCode, ProjectionParameters>
  activeTerritories: TerritoryCode[]
  entries: CompositionEntry[]
  canvas: { referenceScale: number, dimensions: CanvasDimensions } | null
}

// A territory without bounds in the file gets no bounds, as in the loader, which routes no point to it
function entriesOf(config: CompositeProjectionConfig): CompositionEntry[] {
  return config.territories.map(({ code, name, bounds }) => ({ code: code as TerritoryCode, name, ...(bounds && { bounds }) }))
}

export function compositionStateFromConfig(config: CompositeProjectionConfig): CompositionState {
  return {
    territoryParameters: extractTerritoryParameters(config),
    activeTerritories: config.territories.map(territory => territory.code as TerritoryCode),
    entries: entriesOf(config),
    canvas: { referenceScale: config.referenceScale, dimensions: config.canvasDimensions },
  }
}

// The state of a view whose preset is of another type than a composite file
export function compositionStateWithoutConfig(territoryCodes: TerritoryCode[]): CompositionState {
  return {
    territoryParameters: Object.fromEntries(territoryCodes.map(code => [code, referenceParameters({ projectionId: FALLBACK_PROJECTION_ID })])),
    activeTerritories: [],
    entries: [],
    canvas: null,
  }
}

// The translated name of the catalogue for a code that it declares, else the fallback name
export function entryName(code: string, fallback: I18nValue, catalogue: readonly Pick<TerritoryConfig, 'code' | 'name'>[]): I18nValue {
  return catalogue.find(territory => territory.code === code)?.name ?? fallback
}

// The entries with an entry inserted before the first entry that follows it in the order of the catalogue,
// at the end for a code that the catalogue does not declare
export function insertInCatalogueOrder(entries: readonly CompositionEntry[], entry: CompositionEntry, catalogueCodes: readonly string[]): CompositionEntry[] {
  const rank = catalogueCodes.indexOf(entry.code)
  const next = rank === -1 ? -1 : entries.findIndex(({ code }) => catalogueCodes.indexOf(code) > rank)
  return next === -1 ? [...entries, entry] : [...entries.slice(0, next), entry, ...entries.slice(next)]
}
