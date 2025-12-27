/**
 * GraticuleService
 *
 * Core service for graticule geometry calculation.
 * Generates scale-adaptive graticule geometries using d3-geo.
 *
 * Design principles:
 * - Pure functions for geometry calculation
 * - Scale-based level determination
 * - Configurable step sizes and extents
 * - Support for both simple and composite projections
 */

import type {
  GraticuleConfig,
  GraticuleGeometry,
  GraticuleLevel,
} from '@/types/graticule'
import { geoGraticule } from 'd3-geo'
import {
  GRATICULE_DASH_PATTERNS,
  GRATICULE_LEVEL_STEPS,
  GRATICULE_OPACITIES,
  GRATICULE_PRECISIONS,
  GRATICULE_SCALE_THRESHOLDS,
  GRATICULE_STROKE_WIDTH,
} from '@/types/graticule'

/**
 * GraticuleService
 *
 * Static service providing graticule geometry calculation.
 * Uses d3-geo's geoGraticule for geometry generation.
 */
export class GraticuleService {
  /**
   * Calculate graticule level from effective scale
   *
   * Higher scale = higher level = finer grid
   *
   * @param scale - Effective projection scale (baseScale * scaleMultiplier)
   * @returns GraticuleLevel with step size and styling info
   */
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

    // Clamp to valid range
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

  /**
   * Generate graticule geometry for a given level
   *
   * @param level - Graticule level configuration
   * @param config - Optional configuration for extent and precision
   * @returns GeoJSON MultiLineString geometry
   */
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

  /**
   * Generate graticule with full metadata
   *
   * @param scale - Effective projection scale
   * @param config - Optional configuration
   * @param territoryCode - Optional territory code for composite projections
   * @returns GraticuleGeometry with geometry and level info
   */
  static generateGraticuleGeometry(
    scale: number,
    config?: GraticuleConfig,
    territoryCode?: string,
  ): GraticuleGeometry {
    const level = this.calculateLevel(scale)
    const geometry = this.generateGeometry(level, config)

    return {
      geometry,
      level,
      territoryCode,
    }
  }

  /**
   * Generate multiple graticule levels for composite projections
   *
   * Groups territories by their graticule level and generates
   * one geometry per unique level.
   *
   * @param territoryScales - Map of territory code to effective scale
   * @param config - Optional configuration
   * @returns Array of GraticuleGeometry, one per unique level
   */
  static generateMultiLevelGeometries(
    territoryScales: Map<string, number>,
    config?: GraticuleConfig,
  ): GraticuleGeometry[] {
    const levelToTerritories = new Map<number, string[]>()

    for (const [code, scale] of territoryScales) {
      const level = this.calculateLevel(scale)
      const existing = levelToTerritories.get(level.level) ?? []
      existing.push(code)
      levelToTerritories.set(level.level, existing)
    }

    const geometries: GraticuleGeometry[] = []

    for (const [levelNum] of levelToTerritories) {
      const level = this.getLevelConfig(levelNum)
      const geometry = this.generateGeometry(level, config)
      geometries.push({ geometry, level })
    }

    return geometries
  }

  /**
   * Get all defined graticule levels
   *
   * @returns Array of all GraticuleLevel configurations
   */
  static getAllLevels(): GraticuleLevel[] {
    return GRATICULE_LEVEL_STEPS.map((step, index) => {
      const opacity = GRATICULE_OPACITIES[index] ?? 0.3
      const precision = GRATICULE_PRECISIONS[index] ?? 5
      const dashPattern = GRATICULE_DASH_PATTERNS[index]
      return {
        level: index,
        step: [step[0], step[1]] as [number, number],
        strokeWidth: GRATICULE_STROKE_WIDTH,
        opacity,
        className: `graticule-level-${index}`,
        precision,
        dashArray: dashPattern ? [dashPattern[0], dashPattern[1]] : undefined,
      }
    })
  }

  /**
   * Get level configuration by level number
   *
   * @param levelNum - Level number (0-5)
   * @returns GraticuleLevel configuration
   */
  static getLevelConfig(levelNum: number): GraticuleLevel {
    const clampedLevel = Math.max(0, Math.min(levelNum, GRATICULE_LEVEL_STEPS.length - 1))
    const step = GRATICULE_LEVEL_STEPS[clampedLevel] ?? [10, 10]
    const opacity = GRATICULE_OPACITIES[clampedLevel] ?? 0.3
    const precision = GRATICULE_PRECISIONS[clampedLevel] ?? 5
    const dashPattern = GRATICULE_DASH_PATTERNS[clampedLevel]
    return {
      level: clampedLevel,
      step: [step[0], step[1]] as [number, number],
      strokeWidth: GRATICULE_STROKE_WIDTH,
      opacity,
      className: `graticule-level-${clampedLevel}`,
      precision,
      dashArray: dashPattern ? [dashPattern[0], dashPattern[1]] : undefined,
    }
  }
}
