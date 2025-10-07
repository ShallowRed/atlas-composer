/**
 * Territory Data Barrel Export
 *
 * This file provides a central export point for all territory data.
 * Import territory data from here instead of individual files.
 */

// EU
export {
  EU_COUNTRIES,
} from './eu.data'

// France
export {
  ALL_TERRITORIES as FRANCE_ALL_TERRITORIES,
  OVERSEAS_TERRITORIES as FRANCE_OVERSEAS_TERRITORIES,
  MAINLAND_FRANCE,
} from './france.data'

// Portugal
export {
  MAINLAND_PORTUGAL,
  ALL_TERRITORIES as PORTUGAL_ALL_TERRITORIES,
  AUTONOMOUS_REGIONS as PORTUGAL_AUTONOMOUS_REGIONS,
} from './portugal.data'
