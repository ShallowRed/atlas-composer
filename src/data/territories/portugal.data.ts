/**
 * Portugal Territory Data
 * Uses generic adapter to transform unified JSON config
 */

import type { TerritoryConfig } from '@/types/territory'
import config from '../../../configs/portugal.json'
import { createTerritoryExports } from './adapter'

const { mainland, overseas, all } = createTerritoryExports(config)

/**
 * Mainland Portugal
 */
export const MAINLAND_PORTUGAL: TerritoryConfig = mainland

/**
 * Overseas Territories
 */
export const PORTUGAL_OVERSEAS: TerritoryConfig[] = overseas

/**
 * All Portugal territories (mainland + overseas)
 */
export const PORTUGAL_ALL_TERRITORIES: TerritoryConfig[] = all
