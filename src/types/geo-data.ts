/**
 * Geographic Data Type Definitions
 *
 * Domain: Geographic data loading and processing
 * Scope: Frontend types for data service configuration
 */

import type { TerritoryConfig } from '@/types/territory'

export interface GeoDataConfig {
  dataPath: string
  metadataPath: string
  topologyObjectName: string
  territories: TerritoryConfig[]
  isWildcard?: boolean
}
