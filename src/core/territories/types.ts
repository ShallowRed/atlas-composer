import type { TerritoryCode } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'

export interface PresetParameters {
  [territoryCode: string]: Partial<ProjectionParameters>
}

export interface TerritoryResetOperation {
  territoryCode: TerritoryCode
  parameters: ProjectionParameters
}

export interface BulkResetOperation {
  operations: TerritoryResetOperation[]
  activeTerritories?: TerritoryCode[]
}
