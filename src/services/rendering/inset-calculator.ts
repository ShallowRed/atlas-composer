/**
 * InsetCalculator
 *
 * Centralized service for calculating Observable Plot inset values.
 * Ensures consistent inset across map rendering and overlay rendering.
 *
 * Inset is the padding Observable Plot applies around the rendered content.
 * This must be coordinated between:
 * - Plot.plot() rendering (graticules, sphere, geography)
 * - Overlay rendering (composition borders, map limits)
 */
export class InsetCalculator {
  /**
   * Calculate inset for a given view mode and territory type
   *
   * @param viewMode - The current view mode (individual, composite-custom, composite-existing)
   * @param isMainland - Whether the territory is mainland (only relevant for individual mode)
   * @returns Inset value in pixels
   */
  static calculateInset(
    viewMode: 'individual' | 'composite-custom' | 'composite-existing',
    isMainland?: boolean,
  ): number {
    if (viewMode === 'individual') {
      // Individual territory maps: mainland gets more padding, territories get less
      return isMainland ? 20 : 5
    }

    // Composite modes always use 20px inset for consistent spacing
    return 20
  }

  /**
   * Calculate inset for simple rendering mode (backwards compatibility)
   * Used when rendering individual territories outside of view mode context
   *
   * @param isMainland - Whether the territory is mainland
   * @returns Inset value in pixels
   */
  static calculateSimpleInset(isMainland: boolean): number {
    return isMainland ? 20 : 5
  }
}
