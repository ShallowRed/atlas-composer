/**
 * Color Utilities
 * Pure functions for territory coloring based on DaisyUI theme colors
 */

import { isMainlandTerritory } from '@/core/atlases/utils'

export function getTerritoryFillColor(
  code: string | undefined,
  mainlandCode: string | undefined,
  geoDataMainlandCode?: string,
): string {
  const isMainland = isMainlandTerritory(code, mainlandCode, geoDataMainlandCode)
  if (isMainland) {
    return 'color-mix(in oklch, var(--color-primary) 20%, transparent)'
  }
  return 'color-mix(in oklch, var(--color-secondary) 20%, transparent)'
}

export function getTerritoryStrokeColor(
  code: string | undefined,
  mainlandCode: string | undefined,
  geoDataMainlandCode?: string,
): string {
  const isMainland = isMainlandTerritory(code, mainlandCode, geoDataMainlandCode)
  if (isMainland) {
    return 'var(--color-primary)'
  }
  return 'var(--color-secondary)'
}
