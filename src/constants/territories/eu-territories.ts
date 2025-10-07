/**
 * European Union territory configurations
 * Configuration for EU member states
 *
 * @deprecated This file is deprecated and will be removed in a future version.
 *
 * **Migration Guide:**
 * - For pure territory data, use: `@/data/territories/eu.data.ts`
 * - For region configuration, use: `@/config/regions/eu.config.ts`
 * - For territory operations, use: `@/services/TerritoryService.ts`
 * - For region-aware access, use: `@/services/RegionService.ts`
 *
 * The new architecture separates concerns for better maintainability.
 */

import type { GeoDataConfig } from '@/types/territory'

/**
 * Default geographic data configuration for EU territories
 * This configuration can be passed to GeoDataService
 */
export const EU_GEO_DATA_CONFIG: GeoDataConfig = {
  dataPath: '/data/eu-territories-50m.json',
  metadataPath: '/data/eu-metadata-50m.json',
  topologyObjectName: 'territories',
  // No mainlandCode for EU
  overseasTerritories: [], // EU doesn't have overseas territories
}

/**
 * EU member states list
 */
export const EU_COUNTRIES = [
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MT', name: 'Malta' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
] as const
