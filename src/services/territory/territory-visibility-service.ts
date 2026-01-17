/**
 * Territory Visibility Service
 *
 * Domain service for territory visibility business logic.
 * Pure functions with no dependencies - easy to test and reason about.
 *
 * Responsibilities:
 * - Determine when to show empty state in territory controls
 */
export class TerritoryVisibilityService {
  /**
   * Determine if empty state should be shown in territory controls
   *
   * Business Rules:
   * - Show empty state when no territories are active
   * - If first territory is in active territories, hide empty state
   *
   * @param params - Territory visibility parameters
   * @returns true if empty state should be shown
   */
  static shouldShowEmptyState(params: {
    territoryCount: number
    hasMainlandInActiveTerritories?: boolean
  }): boolean {
    const { territoryCount, hasMainlandInActiveTerritories = false } = params

    // If we have territories, never show empty state
    if (territoryCount > 0) {
      return false
    }

    // If primary/first territory is in active list, hide empty state
    if (hasMainlandInActiveTerritories) {
      return false
    }

    // Show empty state only when no territories active
    return true
  }

  /**
   * Check if a territory list contains a specific territory
   *
   * @param territoryCodes - List of active territory codes
   * @param targetCode - The territory code to check
   * @returns true if territory is in the list
   */
  static hasTerritoryInList(
    territoryCodes: string[],
    targetCode: string,
  ): boolean {
    return territoryCodes.includes(targetCode)
  }
}
