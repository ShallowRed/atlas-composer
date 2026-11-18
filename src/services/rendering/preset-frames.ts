import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { Extent, ProjectionFrame } from '@/core/frames'
import { ProjectionLoader } from '@atlas-composer/projection-loader'
import { d3ProjectionFactories } from '@atlas-composer/projection-loader/helpers'

// The published loader with the d3 projections, as a reuser of a preset builds it
export function projectionLoader(): ProjectionLoader {
  const loader = new ProjectionLoader()
  loader.registerAll(d3ProjectionFactories)
  return loader
}

// The sub-projections of a preset through the published loader, each with the rectangle of the canvas that it draws
export function presetFrames(config: CompositeProjectionConfig): ProjectionFrame[] {
  const { width, height } = config.canvasDimensions
  const subProjections = projectionLoader().createSubProjections(config, { scale: config.referenceScale, translate: [width / 2, height / 2] })
  return [...subProjections].map(([code, projection]) => ({
    code,
    projection,
    extent: (projection.clipExtent?.() ?? [[0, 0], [width, height]]) as Extent,
  }))
}
