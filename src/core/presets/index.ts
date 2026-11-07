export type { CompositeConfigContext } from './composite-config'
export { readCompositeConfig } from './composite-config'

export { convertToDefaults, extractTerritoryParameters } from './converter'

export type {
  AtlasProjectionMetadata,
  CompositeCustomConfig,
  LoadResult,
  Preset,
  TerritoryDefaults,
  UnifiedViewConfig,
} from './types'

export { validateCompositePreset, validateViewPreset } from './validator'
