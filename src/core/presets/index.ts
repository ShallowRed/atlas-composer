export type { CompositeConfigContext } from './composite-config'
export { checkAtlasCompatibility, readCompositeConfig } from './composite-config'

export { convertToDefaults, extractTerritoryParameters } from './converter'

export type {
  Preset,
  TerritoryDefaults,
  UnifiedViewConfig,
} from './types'

export { validateCompositePreset, validateViewPreset } from './validator'
