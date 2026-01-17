/**
 * Type definitions for composable return values
 * Ensures type-safe composable interfaces
 */

import type { ComputedRef, Ref } from 'vue'
import type { ProjectionId, TerritoryCode } from '@/types/branded'

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
   * Get projection for a specific territory
   */
  getTerritoryProjection: (territoryCode: TerritoryCode) => string | undefined
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
  code: TerritoryCode
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
   * Whether to show empty state (no territories active)
   */
  shouldShowEmptyState: ComputedRef<boolean>

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
  setTerritoryTranslation: (territoryCode: TerritoryCode, axis: 'x' | 'y', value: number) => void

  /**
   * Set scale for a territory
   */
  setTerritoryScale: (territoryCode: TerritoryCode, value: number) => void

  /**
   * Set projection for a territory
   */
  setTerritoryProjection: (territoryCode: TerritoryCode, projectionId: ProjectionId) => void

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
  getRecommendationBadge: (projectionId: ProjectionId) => RecommendationBadge | null

  /**
   * Get CSS class for projection based on recommendations
   */
  getProjectionClass: (projectionId: ProjectionId) => string

  /**
   * Check if projection is recommended
   */
  isRecommended: (projectionId: ProjectionId) => boolean

  /**
   * Check if projection is in current group
   */
  isInGroup: (projectionId: ProjectionId) => boolean

  /**
   * Get tooltip for projection
   */
  getTooltip: (projectionId: ProjectionId) => string
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

/**
 * Return type for useTerritoryCursor composable
 */
export interface TerritoryCursor {
  /**
   * Whether territory dragging is enabled (composite-custom mode)
   */
  isDragEnabled: ComputedRef<boolean>

  /**
   * Whether a territory is currently being dragged
   */
  isDragging: ComputedRef<boolean>

  /**
   * Code of the territory currently being dragged
   */
  dragTerritoryCode: ComputedRef<string | null>

  /**
   * Code of the territory currently hovered for visual feedback
   */
  hoveredTerritoryCode: ComputedRef<string | null>

  /**
   * Check if a territory can be dragged (only active territories are draggable)
   */
  isTerritoryDraggable: (territoryCode: string) => boolean

  /**
   * Get cursor style for territory element
   */
  getCursorStyle: (territoryCode: string | null) => string

  /**
   * Handle mouse down on territory element
   */
  handleTerritoryMouseDown: (event: MouseEvent) => void

  /**
   * Handle mouse enter on territory element for hover feedback
   */
  handleTerritoryMouseEnter: (event: MouseEvent) => void

  /**
   * Handle mouse leave on territory element
   */
  handleTerritoryMouseLeave: () => void

  /**
   * Cleanup function to remove event listeners
   */
  cleanup: () => void
}

/**
 * Return type for useProjectionPanning composable
 */
export interface ProjectionPanning {
  /**
   * Whether panning is currently active
   */
  isPanning: Readonly<Ref<boolean>>

  /**
   * Whether current projection supports panning
   */
  supportsPanning: ComputedRef<boolean>

  /**
   * Whether current projection supports latitude panning
   */
  supportsLatitudePanning: ComputedRef<boolean>

  /**
   * Cursor style for panning interaction
   */
  cursorStyle: ComputedRef<'grab' | 'grabbing' | 'default'>

  /**
   * Handle mouse down event for panning
   * @returns true if panning started, false otherwise
   */
  handleMouseDown: (event: MouseEvent) => boolean

  /**
   * Cleanup function to remove event listeners
   */
  cleanup: () => void
}
