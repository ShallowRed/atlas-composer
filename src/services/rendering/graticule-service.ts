import type { GraticuleConfig, GraticuleLevel } from '@/types/graticule'
import { geoGraticule } from 'd3-geo'
import {
  GRATICULE_DASH_PATTERNS,
  GRATICULE_LEVEL_STEPS,
  GRATICULE_OPACITIES,
  GRATICULE_PRECISIONS,
  GRATICULE_SCALE_THRESHOLDS,
  GRATICULE_STROKE_WIDTH,
} from '@/types/graticule'

export class GraticuleService {
  static calculateLevel(scale: number): GraticuleLevel {
    let level = 0

    for (let i = 0; i < GRATICULE_SCALE_THRESHOLDS.length; i++) {
      const threshold = GRATICULE_SCALE_THRESHOLDS[i]
      if (threshold !== undefined && scale >= threshold) {
        level = i + 1
      }
      else {
        break
      }
    }

    level = Math.min(level, GRATICULE_LEVEL_STEPS.length - 1)

    const step = GRATICULE_LEVEL_STEPS[level] ?? [10, 10]
    const opacity = GRATICULE_OPACITIES[level] ?? 0.3
    const precision = GRATICULE_PRECISIONS[level] ?? 5
    const dashPattern = GRATICULE_DASH_PATTERNS[level]

    return {
      level,
      step: [step[0], step[1]] as [number, number],
      strokeWidth: GRATICULE_STROKE_WIDTH,
      opacity,
      className: `graticule-level-${level}`,
      precision,
      dashArray: dashPattern ? [dashPattern[0], dashPattern[1]] : undefined,
    }
  }

  static generateGeometry(
    level: GraticuleLevel,
    config?: GraticuleConfig,
  ): GeoJSON.MultiLineString {
    const precision = config?.precision ?? level.precision

    const graticule = geoGraticule()
      .step(level.step)
      .precision(precision)

    if (config?.extent) {
      graticule.extent(config.extent)
    }

    return graticule() as GeoJSON.MultiLineString
  }
}
