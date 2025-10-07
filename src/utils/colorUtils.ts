import { REGION_CONFIGS } from '@/constants/regions'
import { useConfigStore } from '@/stores/config'

/**
 * Color utility functions using DaisyUI theme colors
 * All colors use oklch format with color-mix for opacity control
 */

/**
 * Get all mainland codes from region configurations
 */
function getMainlandCodes(): string[] {
  const codes: string[] = []
  for (const config of Object.values(REGION_CONFIGS)) {
    if (config.splitModeConfig?.mainlandCode) {
      codes.push(config.splitModeConfig.mainlandCode)
    }
    // Also add the geoDataConfig mainlandCode if different
    if (config.geoDataConfig.mainlandCode && !codes.includes(config.geoDataConfig.mainlandCode)) {
      codes.push(config.geoDataConfig.mainlandCode)
    }
  }
  return codes
}

/**
 * Check if a territory code represents a mainland territory
 * Returns false for regions without mainland/overseas distinction (no splitModeConfig.mainlandCode)
 */
function isMainland(code?: string): boolean {
  if (!code)
    return false
  
  const configStore = useConfigStore()
  const regionConfig = configStore.currentRegionConfig
  
  // If the region doesn't have a mainland code defined, treat all territories equally
  // This automatically handles regions like EU where all countries should have the same color
  if (!regionConfig.splitModeConfig?.mainlandCode) {
    return false
  }
  
  const mainlandCodes = getMainlandCodes()
  return mainlandCodes.includes(code)
}

/**
 * Get color for a specific territory code
 * Primary color for mainland territories, secondary for overseas/other territories
 * For regions without mainland distinction, all territories use secondary color
 */
export function getTerritoryFillColor(code?: string): string {
  if (isMainland(code)) {
    return 'color-mix(in oklch, var(--color-primary) 20%, transparent)'
  }
  return 'color-mix(in oklch, var(--color-secondary) 20%, transparent)'
}

/**
 * Get default stroke color for territories
 * Primary color for mainland territories, secondary for overseas/other territories
 * For regions without mainland distinction, all territories use secondary color
 */
export function getTerritoryStrokeColor(code?: string): string {
  if (isMainland(code)) {
    return 'var(--color-primary)'
  }
  return 'var(--color-secondary)'
}
