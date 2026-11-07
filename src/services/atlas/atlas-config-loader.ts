import type { JSONAtlasConfig } from '#types'
import type { LoadedAtlasConfig } from '@/core/atlases/loader'
import type { AtlasId } from '@/types'
import { loadAtlasConfig } from '@/core/atlases/loader'
import {
  getAtlasBehavior,
  getAtlasConfigPath,
  getLoadedConfig,
  isAtlasLoaded,
  setLoadedConfig,
} from '@/core/atlases/registry'
import { JsonFileLoader } from '@/services/data/json-file-loader'
import { logger } from '@/utils/logger'

const debug = logger.atlas.loader

// Names are resolved in the locale of the first load: the cache is keyed by atlas id
export async function loadAtlasConfiguration(atlasId: AtlasId, locale: string): Promise<LoadedAtlasConfig> {
  if (isAtlasLoaded(atlasId)) {
    debug('Atlas %s already loaded from cache', atlasId)
    return getLoadedConfig(atlasId)
  }

  const configPath = getAtlasConfigPath(atlasId)
  if (!configPath) {
    throw new Error(`Atlas '${atlasId}' not found in registry`)
  }

  const file = await JsonFileLoader.loadJSON<JSONAtlasConfig>(configPath.replace(/^\.\//, 'configs/'))
  if (!file.success || !file.data) {
    throw new Error(`Failed to load atlas '${atlasId}': ${file.errors.join(', ')}`)
  }

  const jsonConfig = file.data
  if (!jsonConfig.id || !jsonConfig.territories) {
    throw new Error(`Failed to load atlas '${atlasId}': missing required fields (id, territories)`)
  }

  const loadedConfig = loadAtlasConfig(jsonConfig, getAtlasBehavior(atlasId), locale)
  setLoadedConfig(atlasId, loadedConfig)

  debug('Successfully loaded atlas %s from network', atlasId)
  return loadedConfig
}
