/**
 * Portuguese Territory Data
 * Pure territory definitions with NO logic, NO UI concerns, NO utility functions
 *
 * This file contains ONLY geographic data for Portuguese territories.
 * All configuration, modes, groups, and operations are handled elsewhere.
 */

import type { TerritoryConfig } from '@/types/territory'

/**
 * Mainland Portugal (Portugal Continental)
 */
export const MAINLAND_PORTUGAL: TerritoryConfig = {
  code: 'PT-CONT',
  name: 'Portugal Continental',
  center: [-8.0, 39.5],
  offset: [0, 0],
  bounds: [[-9.5, 37.0], [-6.2, 42.2]],
}

/**
 * Autonomous Regions (Madeira and Azores)
 */
export const AUTONOMOUS_REGIONS: TerritoryConfig[] = [
  {
    code: 'PT-20',
    name: 'Madeira',
    region: 'Atlantic',
    center: [-16.9, 32.75],
    offset: [400, -200],
    bounds: [[-17.5, 32.5], [-16.5, 33.0]],
    projectionType: 'mercator',
  },
  {
    code: 'PT-30',
    name: 'Azores',
    region: 'Atlantic',
    center: [-28.0, 38.5],
    offset: [-400, -100],
    bounds: [[-32.0, 36.5], [-24.5, 40.0]],
    projectionType: 'mercator',
  },
]

/**
 * All Portuguese territories (mainland + autonomous regions)
 */
export const ALL_TERRITORIES: TerritoryConfig[] = [
  MAINLAND_PORTUGAL,
  ...AUTONOMOUS_REGIONS,
]
