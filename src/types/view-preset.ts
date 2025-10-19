/**
 * View Mode Preset Types
 *
 * Defines preset configurations for unified, split, and composite-existing view modes.
 * These are SEPARATE from composite-custom presets to maintain independence.
 *
 * Composite-custom presets remain in configs/presets/ with their existing format.
 * View mode presets are stored in configs/view-presets/ with this format.
 */

import type { ViewMode } from './composite'
import type { ProjectionParameters } from './projection-parameters'

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
 * Supports both uniform (single projection) and individual (per-territory) modes
 */
export interface SplitViewConfig {
  /** Split sub-mode: uniform or individual */
  mode: 'uniform' | 'individual'

  /** Configuration for uniform mode (same projection for all territories) */
  uniform?: {
    projection: {
      id: string
      parameters: ProjectionParameters
    }
  }

  /** Configuration for individual mode (per-territory projections) */
  individual?: {
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
