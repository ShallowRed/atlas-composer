/**
 * Territory Helpers
 * Pure data structure operations for territories (no business logic)
 */

import type { TerritoryConfig } from '@/types'

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
 * Extract territory codes from configurations
 * @param territories - Array of territory configurations
 * @returns Array of territory codes
 */
export function extractTerritoryCodes(territories: TerritoryConfig[]): string[] {
  return territories.map(t => t.code)
}

/**
 * Get territory by code from an array
 * @param territories - Array of territories
 * @param code - Territory code
 * @returns Territory configuration or undefined
 */
export function getTerritoryByCode(
  territories: TerritoryConfig[],
  code: string,
): TerritoryConfig | undefined {
  return territories.find(t => t.code === code)
}

/**
 * Get territory name from an array
 * @param territories - Array of territories
 * @param code - Territory code
 * @returns Territory name or the code if not found
 */
export function getTerritoryNameFromArray(
  territories: TerritoryConfig[],
  code: string,
): string {
  const territory = territories.find(t => t.code === code)
  return territory?.name || code
}

/**
 * Get territories for a specific mode
 * Uses the mode configuration to filter territories
 * @param territories - Array of all territories
 * @param mode - Mode identifier
 * @param modeConfig - Territory mode configuration
 * @returns Filtered array of territories for the mode
 */
export function getTerritoriesForMode(
  territories: TerritoryConfig[],
  mode: string,
  modeConfig: Record<string, any>,
): TerritoryConfig[] {
  const modeDefinition = modeConfig[mode]
  if (!modeDefinition) {
    return []
  }

  // If no codes specified, return empty (mode shows no territories)
  if (modeDefinition.codes.length === 0) {
    return []
  }

  // Resolve wildcards: check if codes include "*"
  let codes = modeDefinition.codes
  if (codes.includes('*')) {
    // Replace wildcard with all territory codes
    codes = territories.map(t => t.code)

    // Handle exclusions from the mode config
    if (modeDefinition.exclude && Array.isArray(modeDefinition.exclude)) {
      codes = codes.filter((code: string) => !modeDefinition.exclude.includes(code))
    }
  }

  // Return territories matching the codes in this mode
  const codesSet = new Set(codes)
  return territories.filter(t => codesSet.has(t.code))
}
