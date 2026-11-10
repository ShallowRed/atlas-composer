/**
 * Types for application initialization and state management
 */

import type { Preset } from '@/core/presets'
import type { SharedLink } from '@/core/view'
import type { Translation } from '@/types'
import type { PresetId, ProjectionId, TerritoryCode } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'

export interface ApplicationState {
  viewMode: string
  territoryMode: string
  preset: {
    id: PresetId
    type: string
    data: Preset
  } | null
  projections: {
    selected: ProjectionId | null
    composite?: ProjectionId | null
  }
  parameters: {
    global: ProjectionParameters
    territories: Record<TerritoryCode, ProjectionParameters>
  }
  territories: {
    projections: Record<TerritoryCode, ProjectionId>
    translations: Record<TerritoryCode, Translation>
    scales: Record<TerritoryCode, number>
  }
  canvas: {
    referenceScale?: number
    dimensions?: { width: number, height: number }
  }
}

export interface AtlasInitializationOptions {
  preserveViewMode?: boolean // Try to keep current view mode if supported
  sharedLink?: SharedLink
}

export interface PresetLoadOptions {
  presetId: PresetId
  skipValidation?: boolean // For testing only
}
