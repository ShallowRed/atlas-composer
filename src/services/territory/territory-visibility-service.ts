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
   *
   * @param territoryCount - Number of active territories
   * @returns true if empty state should be shown
   */
  static shouldShowEmptyState(territoryCount: number): boolean {
    return territoryCount === 0
  }

  /**
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
