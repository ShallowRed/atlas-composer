/**
 * Type definitions for composable return values
 * Ensures type-safe composable interfaces
 */

import type { ComputedRef, Ref } from 'vue'

/**
 * Return type for useLoadingState composable
 */
export interface LoadingState {
  /**
   * Whether to show loading skeleton
   */
  showSkeleton: Ref<boolean>

  /**
   * Wraps an async operation with minimum loading time
   * Ensures loading state shows for at least MIN_LOADING_TIME_MS
   */
  withMinLoadingTime: <T>(operation: () => Promise<T>) => Promise<T>
}

/**
 * Return type for useProjectionConfig composable
 */
export interface ProjectionConfig {
  /**
   * Available composite projection options for current atlas
   */
  compositeProjectionOptions: ComputedRef<Array<{ value: string, label: string }>>

  /**
   * Get projection for mainland in individual mode
   */
  getMainlandProjection: () => string | undefined

  /**
   * Get projection for a specific territory
   */
  getTerritoryProjection: (territoryCode: string) => string | undefined
}

/**
 * Return type for useTerritoryConfig composable
 */
export interface TerritoryConfig {
  /**
   * Whether territories exist for projection configuration
   */
  hasTerritoriesForProjectionConfig: ComputedRef<boolean>
}

/**
 * Return type for useViewMode composable
 */
export interface ViewModeConfig {
  /**
   * Available view mode options with translations
   */
  viewModeOptions: ComputedRef<Array<{ value: string, label: string }>>
}

/**
 * Territory information for controls
 */
export interface TerritoryInfo {
  code: string
  name: string
}

/**
 * Range for translation controls
 */
export interface TranslationRange {
  min: number
  max: number
  step: number
}

/**
 * Range for scale controls
 */
export interface ScaleRange {
  min: number
  max: number
  step: number
}

/**
 * Return type for useTerritoryTransforms composable
 */
export interface TerritoryTransforms {
  /**
   * List of territories with code and name
   */
  territories: ComputedRef<TerritoryInfo[]>

  /**
   * Whether to show mainland section
   */
  showMainland: ComputedRef<boolean>

  /**
   * Mainland territory code
   */
  mainlandCode: ComputedRef<string>

  /**
   * Whether mainland is in filtered territories
   */
  isMainlandInTerritories: ComputedRef<boolean>

  /**
   * Territory translations (x, y coordinates)
   */
  translations: ComputedRef<Record<string, { x: number, y: number }>>

  /**
   * Territory scales
   */
  scales: ComputedRef<Record<string, number>>

  /**
   * Set translation for a territory
   */
  setTerritoryTranslation: (territoryCode: string, axis: 'x' | 'y', value: number) => void

  /**
   * Set scale for a territory
   */
  setTerritoryScale: (territoryCode: string, value: number) => void

  /**
   * Set projection for a territory
   */
  setTerritoryProjection: (territoryCode: string, projectionId: string) => void

  /**
   * Reset transforms to defaults
   */
  resetTransforms: () => void

  /**
   * Projection recommendations for current atlas
   */
  projectionRecommendations: ComputedRef<string[]>

  /**
   * Projection groups for current atlas
   */
  projectionGroups: ComputedRef<string[]>

  /**
   * Current atlas configuration
   */
  currentAtlasConfig: ComputedRef<any>

  /**
   * Territory projections
   */
  territoryProjections: ComputedRef<Record<string, string>>

  /**
   * Selected projection
   */
  selectedProjection: ComputedRef<string | undefined>

  /**
   * Projection mode
   */
  projectionMode: ComputedRef<'uniform' | 'individual'>

  /**
   * Translation range constants
   */
  TRANSLATION_RANGES: {
    x: TranslationRange
    y: TranslationRange
  }

  /**
   * Scale range constants
   */
  SCALE_RANGE: ScaleRange
}

/**
 * Return type for useAtlasData composable
 */
export interface AtlasData {
  /**
   * Whether to show loading skeleton
   */
  showSkeleton: Ref<boolean>

  /**
   * Initialize data for current atlas
   */
  initialize: () => Promise<void>

  /**
   * Load data for specific view mode
   */
  loadDataForViewMode: (viewMode: string) => Promise<void>

  /**
   * Reinitialize data (atlas change)
   */
  reinitialize: () => Promise<void>

  /**
   * Reload unified data
   */
  reloadUnifiedData: () => Promise<void>

  /**
   * Setup watchers for data loading
   */
  setupWatchers: () => void
}

/**
 * Recommendation badge information
 */
export interface RecommendationBadge {
  text: string
  class: string
  tooltip: string
}

/**
 * Return type for useProjectionRecommendations composable
 */
export interface ProjectionRecommendations {
  /**
   * Get recommendation badge for a projection
   */
  getRecommendationBadge: (projectionId: string) => RecommendationBadge | null

  /**
   * Get CSS class for projection based on recommendations
   */
  getProjectionClass: (projectionId: string) => string

  /**
   * Check if projection is recommended
   */
  isRecommended: (projectionId: string) => boolean

  /**
   * Check if projection is in current group
   */
  isInGroup: (projectionId: string) => boolean

  /**
   * Get tooltip for projection
   */
  getTooltip: (projectionId: string) => string
}

/**
 * Return type for useProjectionValidation composable
 */
export interface ProjectionValidation {
  /**
   * Validate projection change and show confirmation if needed
   */
  validateProjectionChange: (
    newProjection: string,
    onConfirm: () => void,
  ) => Promise<void>

  /**
   * Check if projection change is safe (no confirmation needed)
   */
  isSafeProjectionChange: (newProjection: string) => boolean
}
