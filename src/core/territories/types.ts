import type { Translation } from '@/types'
import type { ProjectionId, TerritoryCode } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'

export interface PresetParameters {
  [territoryCode: string]: Partial<ProjectionParameters>
}

export interface TerritoryResetOperation {
  territoryCode: TerritoryCode
  projection?: ProjectionId
  translation: Translation
  scale: number
  parameters?: Partial<ProjectionParameters>
  shouldClearOverrides: boolean
}

export interface BulkResetOperation {
  operations: TerritoryResetOperation[]
  activeTerritories?: TerritoryCode[]
}

export type ResetStrategy = 'preset' | 'fallback'
