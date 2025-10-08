/**
 * Generic Territory Data Adapter
 * Transforms unified JSON configs to frontend territory definitions
 */

import type { TerritoryConfig } from '@/types/territory'

/**
 * Transform territory from JSON config to TerritoryConfig
 */
export function transformTerritory(territory: any): TerritoryConfig {
  return {
    code: territory.code,
    name: territory.name,
    ...(territory.shortName && { shortName: territory.shortName }),
    ...(territory.region && { region: territory.region }),
    center: territory.center,
    offset: territory.rendering?.offset || [0, 0],
    bounds: territory.bounds,
    ...(territory.rendering?.projectionType && { projectionType: territory.rendering.projectionType }),
    ...(territory.rendering?.scale && { scale: territory.rendering.scale }),
    ...(territory.rendering?.rotate && { rotate: territory.rendering.rotate }),
    ...(territory.rendering?.parallels && { parallels: territory.rendering.parallels }),
    ...(territory.rendering?.clipExtent && { clipExtent: territory.rendering.clipExtent }),
    ...(territory.rendering?.baseScaleMultiplier && { baseScaleMultiplier: territory.rendering.baseScaleMultiplier }),
  }
}

/**
 * Create territory exports from unified config
 */
export function createTerritoryExports(config: any) {
  const mainlandTerritory = config.territories.find((t: any) => t.role === 'mainland')
  const overseasTerritories = config.territories.filter((t: any) => t.role === 'overseas')

  if (!mainlandTerritory) {
    throw new Error(`No mainland territory found in ${config.id}`)
  }

  const mainland = transformTerritory(mainlandTerritory)
  const overseas = overseasTerritories.map(transformTerritory)
  const all = [mainland, ...overseas]

  return { mainland, overseas, all }
}
