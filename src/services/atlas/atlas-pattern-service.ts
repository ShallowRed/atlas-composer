import type { ViewMode } from '@/types'

export type AtlasPattern = 'single-focus' | 'equal-members' | 'hierarchical'

/**
 * Service for handling atlas pattern-specific logic
 * Centralizes all pattern detection and behavior rules
 */
export class AtlasPatternService {
  private readonly pattern: AtlasPattern

  constructor(pattern: AtlasPattern) {
    this.pattern = pattern
  }

  /**
   * Check if this is a single-focus atlas (1 primary + N secondary territories)
   * Examples: France, Portugal, Netherlands, USA
   */
  isSingleFocus(): boolean {
    return this.pattern === 'single-focus'
  }

  /**
   * Check if this is an equal-members atlas (N equal territories)
   * Examples: EU, World, ASEAN, Benelux
   */
  isEqualMembers(): boolean {
    return this.pattern === 'equal-members'
  }

  /**
   * Check if this is a hierarchical atlas (future use)
   */
  isHierarchical(): boolean {
    return this.pattern === 'hierarchical'
  }

  /**
   * Check if this pattern supports split view mode
   * Only single-focus atlases can split primary from secondary territories
   */
  supportsSplitView(): boolean {
    return this.isSingleFocus()
  }

  /**
   * Check if this pattern supports built-in-composite mode
   * Only if there are pre-built D3 composite projections available
   */
  supportsCompositeExisting(): boolean {
    // All patterns can potentially have composite projections
    return true
  }

  /**
   * Check if this pattern has a primary territory
   * Single-focus has one primary, equal-members has none
   */
  hasPrimaryTerritory(): boolean {
    return this.isSingleFocus()
  }

  /**
   * Check if all territories are equal (no hierarchy)
   */
  hasEqualTerritories(): boolean {
    return this.isEqualMembers()
  }

  /**
   * Get the default view mode for this pattern
   */
  getDefaultViewMode(): ViewMode {
    if (this.isSingleFocus()) {
      // Single-focus atlases work best with custom composite
      return 'composite-custom'
    }

    if (this.isEqualMembers()) {
      // Equal-members atlases typically use unified view
      return 'unified'
    }

    // Default fallback
    return 'composite-custom'
  }

  /**
   * Get recommended view modes for this pattern
   */
  getRecommendedViewModes(): ViewMode[] {
    if (this.isSingleFocus()) {
      return ['composite-custom', 'split', 'built-in-composite', 'unified']
    }

    if (this.isEqualMembers()) {
      return ['unified', 'composite-custom']
    }

    return ['composite-custom', 'unified']
  }

  /**
   * Check if territory filtering is relevant for this pattern
   */
  supportsTerritorySelectorModes(): boolean {
    // All patterns can have territory modes for filtering
    return true
  }

  /**
   * Get the expected territory role for primary territories
   */
  getPrimaryTerritoryRole(): 'primary' | 'member' | null {
    if (this.isSingleFocus()) {
      return 'primary'
    }

    if (this.isEqualMembers()) {
      return 'member'
    }

    return null
  }

  /**
   * Get the expected territory role for secondary territories
   */
  getSecondaryTerritoryRole(): 'secondary' | 'member' | null {
    if (this.isSingleFocus()) {
      return 'secondary'
    }

    if (this.isEqualMembers()) {
      return 'member'
    }

    return null
  }

  /**
   * Check if scale preservation makes sense for this pattern
   * Only relevant for single-focus when showing territories separately
   */
  supportsScalePreservation(): boolean {
    return this.isSingleFocus()
  }

  /**
   * Get description of this pattern
   */
  getDescription(): string {
    switch (this.pattern) {
      case 'single-focus':
        return 'Single primary territory with multiple secondary territories'
      case 'equal-members':
        return 'Multiple equal territories with no hierarchy'
      case 'hierarchical':
        return 'Complex multi-level territory relationships'
      default:
        return 'Unknown pattern'
    }
  }

  /**
   * Static factory method to create service from pattern
   */
  static fromPattern(pattern: AtlasPattern): AtlasPatternService {
    return new AtlasPatternService(pattern)
  }
}
