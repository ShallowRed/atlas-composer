import type { CanvasDimensions, CompositeProjectionConfig } from '@atlas-composer/specification'
import type { TerritoryCode } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { FALLBACK_PROJECTION_ID } from '@/core/projections/defaults'
import { referenceParameters } from '@/core/territories/territory-reset-service'
import { extractTerritoryParameters } from './converter'

export interface CompositionState {
  territoryParameters: Record<TerritoryCode, ProjectionParameters>
  activeTerritories: TerritoryCode[]
  canvas: { referenceScale: number, dimensions: CanvasDimensions } | null
}

export function compositionStateFromConfig(config: CompositeProjectionConfig): CompositionState {
  return {
    territoryParameters: extractTerritoryParameters(config),
    activeTerritories: config.territories.map(territory => territory.code as TerritoryCode),
    canvas: { referenceScale: config.referenceScale, dimensions: config.canvasDimensions },
  }
}

// The state of a view whose preset is of another type than a composite file
export function compositionStateWithoutConfig(territoryCodes: TerritoryCode[]): CompositionState {
  return {
    territoryParameters: Object.fromEntries(territoryCodes.map(code => [code, referenceParameters({ projectionId: FALLBACK_PROJECTION_ID })])),
    activeTerritories: [],
    canvas: null,
  }
}
