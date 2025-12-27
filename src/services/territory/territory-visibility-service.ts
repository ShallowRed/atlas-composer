import type { AtlasPattern } from '@/services/atlas/atlas-pattern-service'

/**
 * Territory Visibility Service
 *
 * Domain service for territory visibility business logic.
 * Pure functions with no dependencies - easy to test and reason about.
 *
 * Responsibilities:
 * - Determine when to show empty state in territory controls
 * - Territory visibility rules based on atlas pattern
 */
export class TerritoryVisibilityService {
  /**
   * Determine if empty state should be shown in territory controls
   *
   * Business Rules:
   * - Show empty state when no territories are active AND no mainland is visible
   * - Single-focus atlases always show mainland (so hide empty state even with 0 territories)
   * - Equal-members atlases have no mainland (so show empty state when 0 territories)
   * - If mainland is in active territories, hide empty state
   *
   * @param params - Territory visibility parameters
   * @returns true if empty state should be shown
   */
  static shouldShowEmptyState(params: {
    territoryCount: number
    atlasPattern: AtlasPattern
    hasMainlandInActiveTerritories: boolean
  }): boolean {
    const { territoryCount, atlasPattern, hasMainlandInActiveTerritories } = params

    // If we have territories, never show empty state
    if (territoryCount > 0) {
      return false
    }

    // No territories - check if we're showing mainland
    const showsMainland = this.shouldShowMainland(atlasPattern)
    const hasMainlandToShow = showsMainland || hasMainlandInActiveTerritories

    // Show empty state only when no territories AND no mainland to show
    return !hasMainlandToShow
  }

  /**
   * Determine if mainland should be shown for an atlas pattern
   *
   * Business Rule:
   * - Single-focus atlases have a primary mainland territory that should always be shown
   * - Equal-members and hierarchical atlases have no mainland concept
   *
   * @param pattern - Atlas pattern type
   * @returns true if mainland section should be shown
   */
  static shouldShowMainland(pattern: AtlasPattern): boolean {
    return pattern === 'single-focus'
  }

  /**
   * Check if a territory list contains the mainland territory
   *
   * @param territoryCodes - List of active territory codes
   * @param mainlandCode - The mainland territory code
   * @returns true if mainland is in the list
   */
  static hasMainlandInList(
    territoryCodes: string[],
    mainlandCode: string,
  ): boolean {
    return territoryCodes.includes(mainlandCode)
  }
}
