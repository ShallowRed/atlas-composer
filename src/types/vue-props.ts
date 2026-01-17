/**
 * Shared prop type definitions for Vue components
 * Ensures consistent prop types across the application
 */

import type { ViewMode } from './composite'

/**
 * Props for MapRenderer component
 */
export interface MapRendererProps {
  // For simple territory maps
  geoData?: GeoJSON.FeatureCollection | null
  title?: string
  area?: number
  region?: string
  preserveScale?: boolean
  width?: number
  height?: number
  projection?: string // Optional projection override for individual mode

  // For composite maps
  mode?: 'simple' | 'composite'
}

/**
 * Default values for MapRenderer props
 */
export const mapRendererDefaults: Required<Omit<MapRendererProps, 'geoData' | 'title' | 'area' | 'region' | 'projection'>> = {
  preserveScale: false,
  width: 200,
  height: 160,
  mode: 'simple',
}

/**
 * Props for view mode components (SplitView, CompositeView, etc.)
 */
export interface ViewComponentProps {
  /**
   * Current view mode being displayed
   */
  viewMode: ViewMode

  /**
   * Whether to show loading skeleton
   * @default false
   */
  showSkeleton?: boolean
}

/**
 * Props for TerritoryControls component
 */
export interface TerritoryControlsProps {
  /**
   * Territory code to configure
   */
  territoryCode: string

  /**
   * Display name of the territory
   */
  territoryName: string
}

/**
 * Props for projection selector components
 */
export interface ProjectionSelectorProps {
  /**
   * Currently selected projection ID
   */
  modelValue: string

  /**
   * List of available projection IDs
   */
  projections: string[]

  /**
   * Whether the selector is disabled
   * @default false
   */
  disabled?: boolean

  /**
   * Placeholder text when no projection selected
   */
  placeholder?: string

  /**
   * Label for the selector
   */
  label?: string
}

/**
 * Emits for projection selector
 */
export interface ProjectionSelectorEmits {
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}

/**
 * Props for display options section
 */
export interface DisplayOptionsSectionProps {
  /**
   * Whether to show the section
   * @default true
   */
  show?: boolean
}
