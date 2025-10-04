/**
 * Color utility functions using DaisyUI theme colors
 * All colors use oklch format with color-mix for opacity control
 */

/**
 * Get color for a specific territory code
 */
export function getTerritoryFillColor(_code: string): string {
  return 'color-mix(in oklch, var(--color-primary) 20%, transparent)'
}

/**
 * Get default stroke color for territories
 */
export function getTerritoryStrokeColor(): string {
  return 'var(--color-primary)'
}
