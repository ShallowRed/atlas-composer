import type { Selection } from 'd3'
import type { GeoProjection } from 'd3-geo'
import type { CompositeProjection } from '@/services/projection/composite-projection'
import type {
  GraticuleLevel,
  GraticuleOverlayConfig,
} from '@/types/graticule'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { geoPath, select } from 'd3'
import { geoConicConformal } from 'd3-geo'
import { ProjectionFactory } from '@/core/projections/factory'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionFamily, ProjectionStrategy } from '@/core/projections/types'
import { GraticuleService } from '@/services/rendering/graticule-service'
import { logger } from '@/utils/logger'

const debug = logger.render.overlay

interface InternalGraticuleConfig extends GraticuleOverlayConfig {
  customComposite?: CompositeProjection | null
  viewMode?: 'composite-custom' | 'built-in-composite' | 'individual' | 'simple'
  projectionId?: string
  geoData?: GeoJSON.FeatureCollection | GeoJSON.Feature | { type: 'Sphere' }
  projectionParams?: ProjectionParameters
  showSphere?: boolean
  filteredTerritoryCodes?: Set<string>
}

export class GraticuleOverlayService {
  static applyGraticuleOverlays(
    svg: SVGSVGElement,
    config: InternalGraticuleConfig,
  ): void {
    if (!config.showGraticule) {
      return
    }

    debug('applyGraticuleOverlays: showGraticule=%s, viewMode=%s, projectionId=%s', config.showGraticule, config.viewMode, config.projectionId)

    const existingOverlay = select(svg).select('.graticule-overlays')
    if (!existingOverlay.empty()) {
      existingOverlay.remove()
    }

    let projection: GeoProjection | undefined = config.projection

    if (config.viewMode === 'composite-custom' && config.customComposite) {
      projection = config.customComposite.build(config.width, config.height)
      debug('Using customComposite.build() projection for overlay')
    }
    else if (!projection && config.projectionId) {
      projection = this.createProjectionForOverlay(
        config.projectionId,
        config.width,
        config.height,
        config.geoData,
        config.projectionParams,
        config.showSphere,
      )
    }

    if (!projection) {
      debug('No projection available for graticule overlay')
      return
    }

    const resolvedConfig: InternalGraticuleConfig = {
      ...config,
      projection,
    }

    const overlayGroup = select(svg)
      .append('g')
      .classed('graticule-overlays', true)
      .attr('pointer-events', 'none')

    if (config.viewMode === 'composite-custom' && config.customComposite) {
      debug('>>> Using COMPOSITE graticule rendering')
      this.renderCompositeGraticule(overlayGroup, resolvedConfig)
    }
    else {
      debug('>>> Using SIMPLE graticule rendering')
      this.renderSimpleGraticule(overlayGroup, resolvedConfig)
    }

    if (overlayGroup.node()?.childNodes.length === 0) {
      overlayGroup.remove()
    }
  }

  private static createProjectionForOverlay(
    projectionId: string,
    width: number,
    height: number,
    geoData?: GeoJSON.FeatureCollection | GeoJSON.Feature | { type: 'Sphere' },
    params?: ProjectionParameters,
    showSphere?: boolean,
    forceSimpleProjection = false,
  ): GeoProjection | undefined {
    const definition = projectionRegistry.get(projectionId)
    if (!definition) {
      return undefined
    }

    if (forceSimpleProjection && definition.strategy === ProjectionStrategy.D3_COMPOSITE) {
      const projection = geoConicConformal()
      const focusLongitude = params?.focusLongitude ?? 0
      const focusLatitude = params?.focusLatitude ?? 0
      const rotateGamma = params?.rotateGamma ?? 0
      const parallels = params?.parallels

      if (parallels && typeof (projection as any).parallels === 'function') {
        (projection as any).parallels(parallels)
      }

      projection.rotate([-focusLongitude, -focusLatitude, rotateGamma])

      const domain = showSphere ? { type: 'Sphere' as const } : geoData
      if (domain && typeof projection.fitExtent === 'function') {
        projection.fitExtent([[0, 0], [width, height]], domain as any)
        const scaleMultiplier = params?.scaleMultiplier ?? 1.0
        if (scaleMultiplier !== 1.0) {
          projection.scale(projection.scale() * scaleMultiplier)
        }
      }
      else {
        projection.translate([width / 2, height / 2])
      }

      return projection
    }

    const projection = ProjectionFactory.createById(projectionId)
    if (!projection) {
      return undefined
    }

    if (definition.strategy === ProjectionStrategy.D3_COMPOSITE) {
      if (definition.metadata?.requiresCustomFit && definition.metadata.customFit) {
        const customFit = definition.metadata.customFit
        const scaleFactor = width / customFit.referenceWidth
        if (typeof projection.scale === 'function') {
          projection.scale(customFit.defaultScale * scaleFactor)
        }
        if (typeof projection.translate === 'function') {
          projection.translate([width / 2, height / 2])
        }
      }
      else {
        const defaultScale = 900
        const scaleFactor = width / 960
        if (typeof projection.scale === 'function') {
          projection.scale(defaultScale * scaleFactor)
        }
        if (typeof projection.translate === 'function') {
          projection.translate([width / 2, height / 2])
        }
      }
      return projection
    }

    const focusLongitude = params?.focusLongitude ?? 0
    const focusLatitude = params?.focusLatitude ?? 0
    const rotateGamma = params?.rotateGamma ?? 0
    const parallels = params?.parallels
    const scaleMultiplier = params?.scaleMultiplier ?? 1.0

    if (definition.family === ProjectionFamily.CONIC && parallels) {
      if (typeof (projection as any).parallels === 'function') {
        (projection as any).parallels(parallels)
      }
    }

    if (typeof projection.rotate === 'function') {
      projection.rotate([-focusLongitude, -focusLatitude, rotateGamma])
    }

    const domain = showSphere ? { type: 'Sphere' as const } : geoData
    if (domain && typeof projection.fitExtent === 'function') {
      projection.fitExtent([[0, 0], [width, height]], domain as any)
      if (scaleMultiplier !== 1.0 && typeof projection.scale === 'function') {
        projection.scale(projection.scale() * scaleMultiplier)
      }
    }
    else if (typeof projection.translate === 'function') {
      projection.translate([width / 2, height / 2])
    }

    return projection
  }

  private static renderSimpleGraticule(
    group: Selection<SVGGElement, unknown, null, undefined>,
    config: InternalGraticuleConfig,
  ): void {
    const { projection, width, height } = config

    if (!projection) {
      return
    }

    let effectiveScale = config.effectiveScale
    if (!effectiveScale && typeof projection.scale === 'function') {
      effectiveScale = projection.scale()
    }
    effectiveScale = effectiveScale ?? 1000

    const level = GraticuleService.calculateLevel(effectiveScale)
    const geometry = GraticuleService.generateGeometry(level)

    this.renderGraticuleGeometry(group, geometry, level, projection, width, height, config.opacity)
  }

  private static renderCompositeGraticule(
    group: Selection<SVGGElement, unknown, null, undefined>,
    config: InternalGraticuleConfig,
  ): void {
    const { width, height, customComposite, filteredTerritoryCodes } = config

    if (!customComposite) {
      this.renderSimpleGraticule(group, config)
      return
    }

    let subProjections = customComposite.getAllSubProjectionData()

    if (filteredTerritoryCodes) {
      subProjections = subProjections.filter(sp => filteredTerritoryCodes.has(sp.territoryCode))
    }

    if (subProjections.length === 0) {
      this.renderSimpleGraticule(group, config)
      return
    }

    const territoryBorders = customComposite.getCompositionBorders(width, height)
    const screenBoundsMap = new Map<string, [[number, number], [number, number]]>()
    for (const border of territoryBorders) {
      screenBoundsMap.set(border.territoryCode, border.bounds)
    }

    const geometryCache = new Map<number, { geometry: GeoJSON.MultiLineString, level: GraticuleLevel }>()

    const defs = group.append('defs')
    let clipIdCounter = 0

    for (const subProj of subProjections) {
      const screenBounds = screenBoundsMap.get(subProj.territoryCode)
      if (!screenBounds) {
        continue
      }

      const level = GraticuleService.calculateLevel(subProj.scale)

      let cached = geometryCache.get(level.level)
      if (!cached) {
        const geometry = GraticuleService.generateGeometry(level)
        cached = { geometry, level }
        geometryCache.set(level.level, cached)
      }

      const pathGenerator = geoPath(subProj.projection)
      const pathData = pathGenerator(cached.geometry)
      if (!pathData) {
        continue
      }

      const clipId = `graticule-clip-${clipIdCounter++}`
      const [[x0, y0], [x1, y1]] = screenBounds

      defs.append('clipPath')
        .attr('id', clipId)
        .append('rect')
        .attr('x', Math.min(x0, x1))
        .attr('y', Math.min(y0, y1))
        .attr('width', Math.abs(x1 - x0))
        .attr('height', Math.abs(y1 - y0))

      const territoryGroup = group.append('g')
        .attr('class', `graticule-territory graticule-territory-${subProj.territoryCode} ${cached.level.className}`)
        .attr('clip-path', `url(#${clipId})`)

      const path = territoryGroup.append('path')
        .attr('d', pathData)
        .attr('fill', 'none')
        .attr('stroke', 'currentColor')
        .attr('stroke-opacity', config.opacity ?? cached.level.opacity)
        .attr('stroke-width', cached.level.strokeWidth)
        .attr('stroke-linecap', 'round')
        .attr('class', 'graticule-lines')

      if (cached.level.dashArray) {
        path.attr('stroke-dasharray', cached.level.dashArray.join(' '))
      }
    }
  }

  private static renderGraticuleGeometry(
    group: Selection<SVGGElement, unknown, null, undefined>,
    geometry: GeoJSON.MultiLineString,
    level: GraticuleLevel,
    projection: GeoProjection,
    width: number,
    height: number,
    opacityOverride?: number,
  ): void {
    const pathGenerator = geoPath(projection)
    const pathData = pathGenerator(geometry)

    if (!pathData) {
      return
    }

    const graticuleGroup = group
      .append('g')
      .classed('graticule', true)
      .classed(level.className, true)

    const clipId = `graticule-clip-${Math.random().toString(36).substr(2, 9)}`
    graticuleGroup
      .append('defs')
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height)

    const path = graticuleGroup
      .append('path')
      .attr('d', pathData)
      .attr('clip-path', `url(#${clipId})`)
      .attr('fill', 'none')
      .attr('stroke', 'currentColor')
      .attr('stroke-width', level.strokeWidth)
      .attr('stroke-opacity', opacityOverride ?? level.opacity)
      .attr('stroke-linecap', 'round')

    if (level.dashArray) {
      path.attr('stroke-dasharray', level.dashArray.join(' '))
    }
  }
}
