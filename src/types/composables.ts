import type { ComputedRef, Ref } from 'vue'
import type { ProjectionId, TerritoryCode } from '@/types/branded'

export interface LoadingState {
  showSkeleton: Ref<boolean>
  withMinLoadingTime: <T>(operation: () => Promise<T>) => Promise<T>
}

export interface ProjectionConfig {
  getTerritoryProjection: (territoryCode: TerritoryCode) => string | undefined
}

export interface ViewModeConfig {
  viewModeOptions: ComputedRef<Array<{ value: string, label: string }>>
}

export interface TerritoryInfo {
  code: TerritoryCode
  name: string
}

export interface TranslationRange {
  min: number
  max: number
  step: number
}

export interface ScaleRange {
  min: number
  max: number
  step: number
}

export interface TerritoryTransforms {
  territories: ComputedRef<TerritoryInfo[]>
  shouldShowEmptyState: ComputedRef<boolean>
  translations: ComputedRef<Record<string, { x: number, y: number }>>
  scales: ComputedRef<Record<string, number>>
  setTerritoryTranslation: (territoryCode: TerritoryCode, axis: 'x' | 'y', value: number) => void
   * Set scale for a territory
   */
  setTerritoryScale: (territoryCode: TerritoryCode, value: number) => void

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

    initialize: () => Promise<void>

    loadDataForViewMode: (viewMode: string) => Promise<void>

  reinitialize: () => Promise<void>
  reloadUnifiedData: () => Promise<void>
  setupWatchers: () => void
}

export interface RecommendationBadge {
  text: string
  class: string
  tooltip: string
}

export interface ProjectionRecommendations {
  getRecommendationBadge: (projectionId: ProjectionId) => RecommendationBadge | null
  getProjectionClass: (projectionId: ProjectionId) => string
  isRecommended: (projectionId: ProjectionId) => boolean
  isInGroup: (projectionId: ProjectionId) => boolean
  getTooltip: (projectionId: ProjectionId) => string
}

export interface ProjectionValidation {
  validateProjectionChange: (
    newProjection: string,
    onConfirm: () => void,
  ) => Promise<void>
  isSafeProjectionChange: (newProjection: string) => boolean
}

export interface TerritoryCursor {
  isDragEnabled: ComputedRef<boolean>
  isDragging: ComputedRef<boolean>
  dragTerritoryCode: ComputedRef<string | null>
  hoveredTerritoryCode: ComputedRef<string | null>
  isTerritoryDraggable: (territoryCode: string) => boolean

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
