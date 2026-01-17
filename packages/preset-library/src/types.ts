/**
 * Preset Library Types
 *
 * Types for the preset catalog and metadata.
 */

import type { CompositeProjectionConfig } from '@atlas-composer/specification'

/**
 * Preset type discriminator.
 */
export type PresetType = 'composite-custom' | 'built-in-composite' | 'split' | 'unified'

/**
 * Geographic region for categorization.
 */
export type PresetRegion = 'france' | 'portugal' | 'usa' | 'europe' | 'world'

/**
 * Preset metadata for catalog listing.
 */
export interface PresetMetadata {
  /** Unique preset identifier */
  id: string
  /** Human-readable name */
  name: string
  /** Description of the preset */
  description?: string
  /** Target atlas identifier */
  atlasId: string
  /** Preset type */
  type: PresetType
  /** Geographic region */
  region: PresetRegion
  /** Tags for filtering */
  tags?: string[]
  /** Thumbnail URL (relative path) */
  thumbnail?: string
}

/**
 * Full preset entry including configuration.
 */
export interface PresetEntry extends PresetMetadata {
  /** Full configuration (for composite-custom type) */
  config?: CompositeProjectionConfig
}

/**
 * Preset catalog listing all available presets.
 */
export interface PresetCatalog {
  /** Catalog version */
  version: string
  /** Last updated timestamp */
  lastUpdated: string
  /** All presets indexed by ID */
  presets: Record<string, PresetMetadata>
}

/**
 * Filter options for listing presets.
 */
export interface PresetFilterOptions {
  /** Filter by atlas ID */
  atlasId?: string
  /** Filter by preset type */
  type?: PresetType
  /** Filter by region */
  region?: PresetRegion
  /** Filter by tags (any match) */
  tags?: string[]
}
