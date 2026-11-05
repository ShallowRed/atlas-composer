export type {
  AtlasConfig,
  SplitModeConfig,
  TerritoryModeOption,
} from '@/types/atlas'

export type {
  AtlasId,
  PresetId,
  ProjectionId,
  TerritoryCode,
} from '@/types/branded'

export {
  createAtlasId,
  createPresetId,
  createProjectionId,
  createTerritoryCode,
  isAtlasId,
  isPresetId,
  isProjectionId,
  isTerritoryCode,
  unwrapBrand,
} from '@/types/branded'

export type {
  AtlasData,
  LoadingState,
  ProjectionConfig,
  ProjectionRecommendations,
  RecommendationBadge,
  ScaleRange,
  TerritoryInfo,
  TerritoryTransforms,
  TranslationRange,
  ViewModeConfig,
} from '@/types/composables'

export type {
  CompositeProjectionConfig,
  CompositeProjectionDefaults,
  ViewMode,
} from '@/types/composite'

export type {
  CodeGenerationOptions,
  ExportedCompositeConfig,
  ExportedProjectionParameters,
  ExportedTerritory,
  ExportedTerritoryLayout,
  ExportMetadata,
  ExportValidationResult,
} from '@/types/export-config'

export type {
  GeoDataConfig,
} from '@/types/geo-data'

export type {
  BoundingBox,
  ConicParallels,
  Coordinates,
  PixelOffset,
  ProjectionRotation,
  TerritoryCollection,
  TerritoryCollections,
  TerritoryCollectionSet,
  TerritoryConfig,
} from '@/types/territory'

export type {
  DisplayOptionsSectionProps,
  mapRendererDefaults,
  MapRendererProps,
  ProjectionSelectorEmits,
  ProjectionSelectorProps,
  TerritoryControlsProps,
  ViewComponentProps,
} from '@/types/vue-props'
