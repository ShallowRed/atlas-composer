import type { ProjectionId, TerritoryCode } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'

/**
 * Territory reset operation types
 */

export interface Translation {
  x: number
  y: number
}

export interface PresetDefaults {
  projections: Record<string, ProjectionId>
  translations: Record<string, Translation>
  scales: Record<string, number>
}

export interface PresetParameters {
  [territoryCode: string]: Partial<ProjectionParameters>
}

export interface TerritoryConfig {
  code: TerritoryCode
  name: string
  [key: string]: any
}

/**
 * Reset operation for a single territory
 */
export interface TerritoryResetOperation {
  territoryCode: string
  projection?: ProjectionId
  translation: Translation
  scale: number
  parameters?: Partial<ProjectionParameters>
  shouldClearOverrides: boolean
}

/**
 * Bulk reset operation for all territories
 */
export interface BulkResetOperation {
  operations: TerritoryResetOperation[]
  activeTerritories?: string[]
}

/**
 * Reset strategy type
 */
export type ResetStrategy = 'preset' | 'fallback'
