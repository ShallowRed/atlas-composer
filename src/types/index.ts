/**
 * Frontend Type Definitions - Barrel Export
 *
 * Central export point for all frontend-specific types.
 * These types are used throughout the application for runtime
 * map rendering, territory management, and UI configuration.
 *
 * Organization:
 * - territory.ts: Territory data structures
 * - composite.ts: Composite atlas layout types
 * - geo-data.ts: Geographic data loading configuration
 * - atlas.ts: Complete atlas configuration
 *
 * Note: For projection system metadata (D3 projections, registry, etc.),
 * see src/core/projections/types.d.ts
 */

// Atlas configuration types
export type {
  AtlasConfig,
  SplitModeConfig,
  TerritoryModeOption,
} from '@/types/atlas'

// Composable return types
export type {
  AtlasData,
  LoadingState,
  ProjectionConfig,
  ProjectionRecommendations,
  RecommendationBadge,
  ScaleRange,
  TerritoryConfig as TerritoryConfigComposable,
  TerritoryInfo,
  TerritoryTransforms,
  TranslationRange,
  ViewModeConfig,
} from '@/types/composables'

// Composite layout types
export type {
  CompositeProjectionConfig,
  CompositeProjectionDefaults,
  ViewMode,
} from '@/types/composite'

// Export/import configuration types
export type {
  CodeGenerationOptions,
  CompositePattern,
  ExportedCompositeConfig,
  ExportedProjectionParameters,
  ExportedTerritory,
  ExportedTerritoryLayout,
  ExportMetadata,
  ExportValidationResult,
  TerritoryRole,
} from '@/types/export-config'

// Geographic data types
export type {
  GeoDataConfig,
} from '@/types/geo-data'

// Projection configuration types
export type {
  ProjectionConfigWithFamily,
  ProjectionConfig as StandardProjectionConfig,
} from '@/types/projection-config'

// Territory types
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

// Vue component prop types
export type {
  DisplayOptionsSectionProps,
  mapRendererDefaults,
  MapRendererProps,
  ProjectionSelectorEmits,
  ProjectionSelectorProps,
  TerritoryControlsProps,
  ViewComponentProps,
} from '@/types/vue-props'
