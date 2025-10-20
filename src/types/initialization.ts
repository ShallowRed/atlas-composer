/**
 * Types for application initialization and state management
 */

import type { Preset } from '@/core/presets'
import type { AtlasConfig } from '@/types'
import type { ExportedCompositeConfig } from '@/types/export-config'
import type { ProjectionParameters } from '@/types/projection-parameters'

/**
 * Result of an initialization operation
 */
export interface InitializationResult {
  success: boolean
  errors: string[]
  warnings: string[]
  state: ApplicationState | null
}

/**
 * Complete application state snapshot after initialization
 */
export interface ApplicationState {
  atlas: {
    id: string
    config: AtlasConfig
  }
  viewMode: string
  territoryMode: string
  preset: {
    id: string
    type: string
    data: Preset
  } | null
  projections: {
    selected: string | null
    composite?: string | null
  }
  parameters: {
    global: ProjectionParameters
    territories: Record<string, ProjectionParameters>
  }
  territories: {
    projections: Record<string, string>
    translations: Record<string, { x: number, y: number }>
    scales: Record<string, number>
  }
  canvas: {
    referenceScale?: number
    dimensions?: { width: number, height: number }
  }
  display: {
    showGraticule: boolean
    showCompositionBorders: boolean
    showMapLimits: boolean
  }
}

/**
 * Options for atlas initialization
 */
export interface AtlasInitializationOptions {
  atlasId: string
  preserveViewMode?: boolean // Try to keep current view mode if supported
}

/**
 * Options for preset loading
 */
export interface PresetLoadOptions {
  presetId: string
  skipValidation?: boolean // For testing only
}

/**
 * Options for configuration import
 */
export interface ImportOptions {
  config: ExportedCompositeConfig
  validateAtlasCompatibility?: boolean
}

/**
 * Options for view mode change
 */
export interface ViewModeChangeOptions {
  viewMode: string
  autoLoadPreset?: boolean // Load first available preset for new mode
}

/**
 * Validation result for presets and configurations
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  metadata?: {
    territoriesInPreset: string[]
    territoriesInAtlas: string[]
    missingTerritories: string[]
    extraTerritories: string[]
  }
}
