/**
 * Territory Helpers
 * Pure data structure operations for territories (no business logic)
 */

import type { TerritoryConfig } from '@/types/territory'

/**
 * Create a territory lookup map by code
 * @param territories - Array of territory configurations
 * @returns Map of territory code to configuration
 */
export function createTerritoryMap(territories: TerritoryConfig[]): Map<string, TerritoryConfig> {
  return new Map(territories.map(t => [t.code, t]))
}

/**
 * Get territory configuration by code from a map
 * @param territories - Territory map
 * @param code - Territory code
 * @returns Territory configuration or undefined
 */
export function getTerritoryConfig(
  territories: Map<string, TerritoryConfig>,
  code: string,
): TerritoryConfig | undefined {
  return territories.get(code)
}

/**
 * Get territory name by code
 * @param territories - Territory map
 * @param code - Territory code
 * @returns Territory name or the code if not found
 */
export function getTerritoryName(
  territories: Map<string, TerritoryConfig>,
  code: string,
): string {
  return territories.get(code)?.name || code
}

/**
 * Get territory short name (or full name if no short name)
 * @param territories - Territory map
 * @param code - Territory code
 * @returns Territory short name or full name or the code if not found
 */
export function getTerritoryShortName(
  territories: Map<string, TerritoryConfig>,
  code: string,
): string {
  const config = territories.get(code)
  return config?.shortName || config?.name || code
}

/**
 * Create default territory translations from configurations
 * @param territories - Array of territory configurations
 * @returns Record of territory code to translation coordinates
 */
export function createDefaultTranslations(
  territories: TerritoryConfig[],
): Record<string, { x: number, y: number }> {
  return Object.fromEntries(
    territories.map(t => [t.code, { x: t.offset[0], y: t.offset[1] }]),
  )
}

/**
 * Extract territory codes from configurations
 * @param territories - Array of territory configurations
 * @returns Array of territory codes
 */
export function extractTerritoryCodes(territories: TerritoryConfig[]): string[] {
  return territories.map(t => t.code)
}

/**
 * Check if a territory code represents a mainland territory
 * Returns false for regions without mainland/overseas distinction
 *
 * @param code - Territory code to check
 * @param mainlandCode - Mainland code from splitModeConfig
 * @param geoDataMainlandCode - Mainland code from geoDataConfig (fallback)
 * @returns True if the code represents mainland territory
 */
export function isMainlandTerritory(
  code: string | undefined,
  mainlandCode: string | undefined,
  geoDataMainlandCode?: string,
): boolean {
  if (!code || !mainlandCode) {
    return false
  }

  // Check if this code matches the mainland code
  return code === mainlandCode || code === geoDataMainlandCode
}
