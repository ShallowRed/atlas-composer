/**
 * Color Utilities
 * Pure functions for territory coloring based on DaisyUI theme colors
 *
 * All territories use the same color scheme - no hierarchy distinction.
 */

/**
 * Get fill color for a territory
 * All territories use the same color for visual equality
 */
export function getTerritoryFillColor(): string {
  return 'color-mix(in oklch, var(--color-primary) 20%, transparent)'
}

/**
 * Get stroke color for a territory
 * All territories use the same color for visual equality
 */
export function getTerritoryStrokeColor(): string {
  return 'var(--color-primary)'
}
