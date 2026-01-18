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
  LoaderOptions,
  ProjectionFactory,
  ProjectionLike,
  StreamLike,
} from './projection-loader'
