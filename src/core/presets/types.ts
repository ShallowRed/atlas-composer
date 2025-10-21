/**
 * Preset Domain Types
 *
 * Core type definitions for the preset system.
 * Unified types for all preset configurations (composite-custom, unified, split, built-in-composite).
 */

import type { ViewMode } from '@/types/composite'
import type { ExportedCompositeConfig } from '@/types/export-config'
import type { ProjectionParameters } from '@/types/projection-parameters'

// ============================================================================
// Generic Load Result Type
// ============================================================================

/**
 * Generic result type for preset loading operations
 * Used across all preset types for consistent error handling
 */
export interface LoadResult<T> {
  success: boolean
  data?: T
  errors: string[]
  warnings: string[]
}

// ============================================================================
// Common Domain Types
// ============================================================================

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

// ============================================================================
// Base Preset Types
// ============================================================================

/**
 * Base metadata shared by all presets
 */
export interface BasePresetMetadata {
  /** Unique preset identifier */
  id: string
  /** Human-readable name */
  name: string
  /** Optional description */
  description?: string
  /** Target atlas ID */
  atlasId: string
}

// ============================================================================
// View Mode Preset Types
// ============================================================================

/**
 * View modes that support view presets
 */
export type ViewPresetMode = Extract<ViewMode, 'unified' | 'split' | 'built-in-composite'>

/**
 * All supported preset types (discriminator for unified Preset type)
 */
export type PresetType = 'composite-custom' | ViewPresetMode

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
   */
  globalScale?: number
}

/**
 * Composite-custom preset configuration (exportable format with optional atlas metadata)
 * Extends ExportedCompositeConfig with optional atlas-level projection metadata
 */
export interface CompositeCustomConfig extends ExportedCompositeConfig {
  /** Optional atlas-level projection metadata */
  atlasMetadata?: AtlasProjectionMetadata
}

// ============================================================================
// Unified Preset Types (Discriminated Union)
// ============================================================================

/**
 * Composite-custom preset (rich, exportable)
 */
export interface CompositePreset extends BasePresetMetadata {
  type: 'composite-custom'
  config: CompositeCustomConfig
}

/**
 * Unified view mode preset
 */
export interface UnifiedPreset extends BasePresetMetadata {
  type: 'unified'
  config: UnifiedViewConfig
}

/**
 * Split view mode preset
 */
export interface SplitPreset extends BasePresetMetadata {
  type: 'split'
  config: SplitViewConfig
}

/**
 * Composite-existing view mode preset
 */
export interface CompositeExistingPreset extends BasePresetMetadata {
  type: 'built-in-composite'
  config: CompositeExistingViewConfig
}

/**
 * Unified preset type (discriminated union)
 * Replaces separate CompositePreset and ViewModePreset types
 */
export type Preset
  = | CompositePreset
    | UnifiedPreset
    | SplitPreset
    | CompositeExistingPreset
