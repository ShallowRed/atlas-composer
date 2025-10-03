/**
 * Color utility functions using DaisyUI theme colors
 * All colors use oklch format with color-mix for opacity control
 */

/**
 * Get color for a specific territory code
 * @param _code - Territory code (e.g., 'FR-GF', 'FR-GP', 'metropole')
 * @returns DaisyUI theme color with appropriate opacity
 */
export function getTerritoryColor(_code: string): string {
  return 'color-mix(in oklch, var(--color-primary) 20%, transparent)'
  // Using DaisyUI theme colors with color-mix for subtle, muted territory colors
  // const colors: { [key: string]: string } = {
  //   'FR-GF': 'color-mix(in oklch, var(--color-success) 40%, transparent)', // Guyane
  //   'FR-GP': 'color-mix(in oklch, var(--color-warning) 50%, transparent)', // Guadeloupe
  //   'FR-MQ': 'color-mix(in oklch, var(--color-error) 30%, transparent)', // Martinique
  //   'FR-RE': 'color-mix(in oklch, var(--color-secondary) 40%, transparent)', // Réunion
  //   'FR-YT': 'color-mix(in oklch, var(--color-info) 40%, transparent)', // Mayotte
  //   'FR-MF': 'color-mix(in oklch, var(--color-warning) 40%, transparent)', // Saint-Martin
  //   'FR-PF': 'color-mix(in oklch, var(--color-accent) 40%, transparent)', // Polynésie française
  //   'FR-NC': 'color-mix(in oklch, var(--color-primary) 30%, transparent)', // Nouvelle-Calédonie
  //   'FR-TF': 'color-mix(in oklch, var(--color-accent) 30%, transparent)', // Terres australes
  //   'FR-WF': 'color-mix(in oklch, var(--color-secondary) 30%, transparent)', // Wallis-et-Futuna
  //   'FR-PM': 'color-mix(in oklch, var(--color-secondary) 35%, transparent)', // Saint-Pierre-et-Miquelon
  //   'metropole': 'color-mix(in oklch, var(--color-primary) 20%, transparent)' // Metropolitan France
  // }

  // return colors[code] || colors['metropole'] || 'var(--color-base-200)'
}

/**
 * Get color for a geographic region
 * @param _region - Region name (e.g., 'North America', 'Caribbean', 'Pacific Ocean')
 * @returns DaisyUI theme color with appropriate opacity
 */
export function getRegionColor(_region: string): string {
  return 'color-mix(in oklch, var(--color-primary) 20%, transparent)'
  // const regionColors: { [key: string]: string } = {
  //   'North America': 'color-mix(in oklch, var(--color-secondary) 15%, transparent)',
  //   'Caribbean': 'color-mix(in oklch, var(--color-accent) 15%, transparent)',
  //   'Pacific Ocean': 'color-mix(in oklch, var(--color-info) 15%, transparent)',
  //   'Indian Ocean': 'color-mix(in oklch, var(--color-primary) 15%, transparent)',
  //   'Other': 'var(--color-base-200)'
  // }
  // return regionColors[region] || 'var(--color-base-200)'
}

/**
 * Get metropolitan France fill color
 * @returns DaisyUI success color with low opacity
 */
export function getMetropolitanFranceColor(): string {
  return 'color-mix(in oklch, var(--color-primary) 20%, transparent)'
  // return 'color-mix(in oklch, var(--color-success) 15%, transparent)'
}

/**
 * Get stroke color for map boundaries
 * @returns DaisyUI success color (full opacity)
 */
export function getMetropolitanFranceStrokeColor(): string {
  return 'var(--color-primary)'
  // return 'var(--color-success)'
}

/**
 * Get default stroke color for territories
 * @returns DaisyUI base content color for borders
 */
export function getDefaultStrokeColor(): string {
  return 'var(--color-primary)'
  // return 'var(--color-base-300)'
  // return 'var(--color-base-content)'
}

/**
 * Get base background color
 * @returns DaisyUI base-200 color
 */
export function getBaseColor(): string {
  return 'var(--color-base-200)'
}
