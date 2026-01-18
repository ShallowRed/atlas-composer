export {
  clearProjections,
  getRegisteredProjections,
  isProjectionRegistered,
  loadCompositeProjection,
  loadFromJSON,
  registerProjection,
  registerProjections,
  unregisterProjection,
  validateConfig,
} from './standalone-projection-loader'

export type {
  ExportedConfig,
  Layout,
  LoaderOptions,
  ProjectionFactory,
  ProjectionLike,
  ProjectionParameters,
  StreamLike,
  Territory,
} from './standalone-projection-loader'
