export {
  clearProjections,
  getRegisteredProjections,
  isProjectionRegistered,
  loadCompositeProjection,
  loadFromJSON,
  ProjectionLoader,
  registerProjection,
  registerProjections,
  unregisterProjection,
  validateConfig,
} from './projection-loader'

export type {
  ExportedConfig,
  Layout,
  LoaderOptions,
  ProjectionFactory,
  ProjectionLike,
  ProjectionParameters,
  StreamLike,
  Territory,
} from './projection-loader'
