import type { JSONAtlasConfig } from '#types'
import type { LoadedAtlasConfig } from '@/core/atlases/loader'
import type { AtlasConfigError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { AtlasId } from '@/types'
import { loadAtlasConfig } from '@/core/atlases/loader'
import {
  getAtlasBehavior,
  getAtlasConfigPath,
  getLoadedConfig,
  isAtlasLoaded,
  resolveConfigPath,
  setLoadedConfig,
} from '@/core/atlases/registry'
import { err, ok } from '@/core/types/result'
import { JsonFileLoader } from '@/services/data/json-file-loader'
import { logger } from '@/utils/logger'

const debug = logger.atlas.loader

// Territory names are resolved in the locale of the first load: the cache is keyed by atlas id
export async function loadAtlasConfiguration(atlasId: AtlasId, locale: string): Promise<Result<LoadedAtlasConfig, AtlasConfigError>> {
  if (isAtlasLoaded(atlasId)) {
    debug('Atlas %s already loaded from cache', atlasId)
    return ok(getLoadedConfig(atlasId))
  }

  const configPath = getAtlasConfigPath(atlasId)
  if (!configPath) {
    return err({ code: 'ATLAS_UNKNOWN', atlasId })
  }

  const file = await JsonFileLoader.loadJSON<JSONAtlasConfig>(resolveConfigPath(configPath))
  if (!file.ok) {
    return file
  }

  const jsonConfig = file.value
  if (!jsonConfig?.id || !jsonConfig.territories) {
    return err({ code: 'ATLAS_CONFIG_INVALID', atlasId })
  }

  const loadedConfig = loadAtlasConfig(jsonConfig, getAtlasBehavior(atlasId), locale)
  setLoadedConfig(atlasId, loadedConfig)

  debug('Successfully loaded atlas %s from network', atlasId)
  return ok(loadedConfig)
}
