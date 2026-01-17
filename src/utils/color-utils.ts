/**
 * Color Utilities
 * Pure functions for territory coloring based on DaisyUI theme colors
 *
 * All territories use the same color scheme - no hierarchy distinction.
 */

/**
 * All territories use the same color for visual equality
 */
export function getTerritoryFillColor(): string {
  return 'color-mix(in oklch, var(--color-primary) 20%, transparent)'
}

/**
 * All territories use the same color for visual equality
 */
export function getTerritoryStrokeColor(): string {
  return 'var(--color-primary)'
}
