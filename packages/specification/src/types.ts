import type { CompositeProjectionConfig, TerritoryConfig } from './generated/types.js'

export type {
  AtlasMetadata,
  CanvasDimensions,
  CompositeProjectionConfig,
  ConfigMetadata,
  GeoBounds,
  I18NString as I18nString,
  LayoutConfig,
  ProjectionFamily,
  ProjectionParameters,
  TerritoryConfig,
} from './generated/types.js'

export function getTerritoryCodes(config: CompositeProjectionConfig): string[] {
  return config.territories.map(t => t.code)
}

export function findTerritory(
  config: CompositeProjectionConfig,
  code: string,
): TerritoryConfig | undefined {
  return config.territories.find(t => t.code === code)
}

export const SPECIFICATION_VERSION = '1.1'
export const DEFAULT_REFERENCE_SCALE = 2700
