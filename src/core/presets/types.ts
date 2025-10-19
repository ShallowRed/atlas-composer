/**
 * Preset Domain Types
 *
 * Core type definitions for the preset system.
 * These types represent the domain model for preset configurations
 * used across both composite-custom and view mode presets.
 */

import type { ViewMode } from '@/types/composite'
import type { ExportedCompositeConfig } from '@/types/export-config'
import type { ProjectionParameters } from '@/types/projection-parameters'

/**
 * Territory defaults result containing all initialization data
 * Used to initialize store state with preset values
 */
export interface TerritoryDefaults {
  projections: Record<string, string>
  translations: Record<string, { x: number, y: number }>
  scales: Record<string, number>
}

/**
 * Atlas projection metadata extracted from atlas configuration
 * Used to provide default projection settings and recommendations
 */
export interface AtlasProjectionMetadata {
  compositeProjections?: string[]
  defaultCompositeProjection?: string
  projectionPreferences?: {
    recommended?: string[]
    default?: {
      mainland?: string
      overseas?: string
    }
    prohibited?: string[]
  }
  projectionParameters?: {
    center?: { longitude: number, latitude: number }
    rotate?: {
      mainland?: [number, number]
      azimuthal?: [number, number]
    }
    parallels?: { conic?: [number, number] }
  }
}

/**
 * Extended preset configuration with atlas metadata
 * Combines exported composite config with optional atlas-level metadata
 */
export interface ExtendedPresetConfig extends ExportedCompositeConfig {
  /** Optional atlas-level projection metadata */
  atlasMetadata?: AtlasProjectionMetadata
}

/**
 * Result of loading a preset configuration
 */
export interface PresetLoadResult {
  success: boolean
  preset?: ExtendedPresetConfig
  errors: string[]
  warnings: string[]
}

// ============================================================================
// View Mode Preset Types
// ============================================================================

/**
 * View modes that support view presets
 * (composite-custom uses its own separate preset system)
 */
export type ViewPresetMode = Extract<ViewMode, 'unified' | 'split' | 'composite-existing'>

/**
 * Unified view mode configuration
 * Single projection for the entire atlas
 */
export interface UnifiedViewConfig {
  projection: {
    /** Projection ID from registry (e.g., 'natural-earth', 'mercator') */
    id: string
    /** Projection parameters (rotate, center, parallels, etc.) */
    parameters: ProjectionParameters
  }
}

/**
 * Split view mode configuration
 * Always uses individual projections per territory
 */
export interface SplitViewConfig {
  /** Mainland/primary territory projection */
  mainland: {
    projection: {
      id: string
      parameters: ProjectionParameters
    }
  }
  /** Secondary territories projections keyed by territory code */
  territories: Record<string, {
    projection: {
      id: string
      parameters: ProjectionParameters
    }
  }>
}

/**
 * Composite-existing view mode configuration
 * Uses d3-composite-projections library
 */
export interface CompositeExistingViewConfig {
  /** D3 composite projection ID (e.g., 'conic-conformal-france') */
  projectionId: string

  /**
   * Optional global scale multiplier
   * Applied to the entire composite projection (default: 1.0)
   * Note: Individual projection parameters cannot be overridden
   * (respects d3-composite-projections library design)
   */
  globalScale?: number
}

/**
 * View mode preset configuration
 * Each preset defines settings for ONE view mode
 */
export interface ViewModePreset {
  /** Unique preset identifier */
  id: string

  /** Human-readable preset name */
  name: string

  /** Optional description */
  description?: string

  /** Target atlas ID (e.g., 'france', 'portugal', 'eu') */
  atlasId: string

  /** View mode this preset is for */
  viewMode: ViewPresetMode

  /** View mode-specific configuration */
  config: UnifiedViewConfig | SplitViewConfig | CompositeExistingViewConfig
}

/**
 * View preset registry
 * Lists all available view presets (loaded from configs/view-presets/registry.json)
 */
export interface ViewPresetRegistry {
  /** Schema version */
  version: string

  /** List of available presets */
  presets: Array<{
    id: string
    name: string
    atlasId: string
    viewMode: ViewPresetMode
    description?: string
  }>
}

/**
 * Result of loading a view preset
 */
export interface ViewPresetLoadResult {
  success: boolean
  preset?: ViewModePreset
  errors: string[]
  warnings: string[]
}
