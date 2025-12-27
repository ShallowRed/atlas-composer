import type { AtlasId, ViewMode } from '@/types'

import { projectionRegistry } from '@/core/projections/registry'
import { ViewModeSelection } from '@/core/view'

/**
 * Options for projection grouping
 */
export interface ProjectionGroupOptions {
  value: string
  label: string
  category?: string
}

/**
 * Grouped projections by category
 */
export interface ProjectionGroup {
  category: string
  options?: ProjectionGroupOptions[]
}

/**
 * Service for projection UI logic
 * Handles projection grouping, filtering, and UI state decisions
 *
 * Domain Model Integration:
 * - Uses ViewModeSelection value object for view mode logic
 */
export class ProjectionUIService {
  /**
   * Get projection groups filtered and organized by category
   *
   * @param atlasId - Current atlas identifier
   * @param viewMode - Current view mode
   * @returns Array of projection groups organized by category
   */
  static getProjectionGroups(
    atlasId: AtlasId,
    viewMode: ViewMode,
  ): ProjectionGroup[] {
    // Use projection registry for context-aware filtering
    const filteredProjections = projectionRegistry.filter({
      atlasId,
      viewMode,
      // Exclude composite projections - they're shown in separate selector
      excludeCategories: ['COMPOSITE'],
    })

    // Group projections by category
    const groups: { [key: string]: ProjectionGroupOptions[] } = {}

    filteredProjections.forEach((projection) => {
      const category = projection.category
      if (!groups[category]) {
        groups[category] = []
      }
      // Convert projection definition to UI format
      groups[category]!.push({
        value: projection.id,
        label: projection.name,
        category: projection.category,
      })
    })

    return Object.keys(groups).map(category => ({
      category,
      options: groups[category],
    }))
  }

  /**
   * Get projection recommendations based on current context
   *
   * @param atlasId - Current atlas identifier
   * @param viewMode - Current view mode
   * @returns Array of recommended projections
   */
  static getProjectionRecommendations(
    atlasId: AtlasId,
    viewMode: ViewMode,
  ) {
    return projectionRegistry.recommend({
      atlasId,
      viewMode,
      excludeCategories: ['COMPOSITE'],
    })
  }

  /**
   * Determine if uniform projection selector should be shown
   *
   * View preset system: unified, split, and built-in-composite modes use presets to define projections
   * Only composite-custom mode allows manual projection selection
   *
   * @param viewMode - Current view mode
   * @param hasViewPreset - Whether a view preset is currently loaded
   * @returns True if uniform projection selector should be visible
   */
  static shouldShowProjectionSelector(
    viewMode: ViewMode,
    hasViewPreset = false,
  ): boolean {
    const selection = new ViewModeSelection(viewMode)

    // Hide projection selector when view preset is active for non-custom modes
    if (hasViewPreset && !selection.isCustomComposite()) {
      return false
    }

    // Only show in unified mode (when no preset is active)
    return selection.isUnified()
  }

  /**
   * Determine if individual projection selectors should be shown
   *
   * Always uses individual projections per territory in split/composite-custom modes
   *
   * @param viewMode - Current view mode
   * @returns True if per-territory projection selectors should be visible
   */
  static shouldShowIndividualProjectionSelectors(
    viewMode: ViewMode,
  ): boolean {
    const selection = new ViewModeSelection(viewMode)
    // Show per-territory projection selectors in split and custom composite modes
    return selection.isSplit() || selection.isCustomComposite()
  }

  /**
   * Determine if territory selector should be shown
   *
   * @param viewMode - Current view mode
   * @returns True if territory selector should be visible
   */
  static shouldShowTerritorySelector(viewMode: ViewMode): boolean {
    const selection = new ViewModeSelection(viewMode)
    // Hide territory selector for built-in-composite mode
    // Built-in composite projections render all territories as a monolithic unit
    return !selection.isBuiltInComposite()
  }

  /**
   * Determine if scale preservation toggle should be shown
   *
   * @param viewMode - Current view mode
   * @returns True if scale preservation toggle should be visible
   */
  static shouldShowScalePreservation(viewMode: ViewMode): boolean {
    const selection = new ViewModeSelection(viewMode)
    // Show scale preservation only in split view mode
    return selection.isSplit()
  }

  /**
   * Determine if territory controls should be shown
   *
   * @param viewMode - Current view mode
   * @returns True if territory translation/scale controls should be visible
   */
  static shouldShowTerritoryControls(viewMode: ViewMode): boolean {
    const selection = new ViewModeSelection(viewMode)
    // Use domain model method - territory controls shown for split and custom composite
    return selection.showsTerritoryControls()
  }
}
