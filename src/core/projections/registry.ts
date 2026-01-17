/**
 * Projection Registry
 *
 * Singleton registry that manages all projection definitions and provides
 * methods for querying, filtering, and recommending projections based on
 * atlas preferences.
 */

import type {
  ProjectionCategoryType,
  ProjectionDefinition,
  ProjectionFilterContext,
  ProjectionRecommendation,
  ProjectionStrategyType,
} from './types'
import type { ProjectionPreferences } from '@/core/atlases/loader'

import { getDefaultProjectionPreferences } from '@/core/projections/defaults'
import { ALL_PROJECTIONS } from '@/core/projections/definitions'
import { logger } from '@/utils/logger'

const debug = logger.projection.registry

/**
 * Projection Registry Class
 *
 * Singleton that manages all projection definitions and provides methods for:
 * - Querying projections by ID, category, or strategy
 * - Filtering projections by atlas, view mode, and capabilities
 * - Recommending projections based on atlas preferences
 */
class ProjectionRegistry {
  private definitions: Map<string, ProjectionDefinition>
  private static instance: ProjectionRegistry

  private constructor() {
    this.definitions = new Map()
    this.registerAll()
  }

  /**
   * Get singleton instance of the projection registry
   *
   * @returns The singleton ProjectionRegistry instance
   */
  public static getInstance(): ProjectionRegistry {
    if (!ProjectionRegistry.instance) {
      ProjectionRegistry.instance = new ProjectionRegistry()
    }
    return ProjectionRegistry.instance
  }

  /**
   * Register all projection definitions from the definitions directory
   */
  private registerAll(): void {
    ALL_PROJECTIONS.forEach((definition) => {
      this.register(definition)
    })
  }

  /**
   * Get projection preferences for an atlas with fallback defaults
   * Uses centralized defaults from projections/defaults.ts
   *
   * @param atlasId - Atlas identifier
   * @returns Projection preferences or fallback defaults
   */
  private getProjectionPreferences(atlasId: string): ProjectionPreferences {
    return getDefaultProjectionPreferences(atlasId)
  }

  /**
   * Register a projection definition with its ID and aliases
   *
   * @param definition - The projection definition to register
   * @internal
   */
  public register(definition: ProjectionDefinition): void {
    // Register by ID
    this.definitions.set(definition.id, definition)

    // Register by aliases (with collision detection)
    if (definition.aliases) {
      definition.aliases.forEach((alias) => {
        // Check for collision with existing projections
        const existing = this.definitions.get(alias)
        if (existing && existing.id !== definition.id) {
          debug(
            'Alias collision detected! Alias "%s" from projection "%s" conflicts with existing projection "%s". The alias will be overwritten.',
            alias,
            definition.id,
            existing.id,
          )
        }
        this.definitions.set(alias, definition)
      })
    }
  }

  /**
   * Get a projection definition by ID or alias
   *
   * Supports case-insensitive lookup for both IDs and aliases.
   *
   * @param id - Projection ID or alias (e.g., 'mercator', 'MERCATOR', 'conicConformal')
   * @returns The projection definition, or undefined if not found
   */
  public get(id: string): ProjectionDefinition | undefined {
    // Try exact match by ID first
    const definition = this.definitions.get(id)
    if (definition) {
      return definition
    }

    // Try case-insensitive match by ID or alias
    const lowerCaseId = id.toLowerCase()
    for (const [key, value] of this.definitions.entries()) {
      // Check if ID matches (case-insensitive)
      if (key.toLowerCase() === lowerCaseId) {
        return value
      }

      // Check if any alias matches (case-insensitive)
      if (value.aliases) {
        for (const alias of value.aliases) {
          if (alias.toLowerCase() === lowerCaseId) {
            return value
          }
        }
      }
    }

    return undefined
  }

    public getAll(): ProjectionDefinition[] {
    const seen = new Set<string>()
    const projections: ProjectionDefinition[] = []

    this.definitions.forEach((definition) => {
      if (!seen.has(definition.id)) {
        seen.add(definition.id)
        projections.push(definition)
      }
    })

    return projections
  }

    public getByCategory(category: ProjectionCategoryType): ProjectionDefinition[] {
    return this.getAll().filter(def => def.category === category)
  }

    public getByStrategy(strategy: ProjectionStrategyType): ProjectionDefinition[] {
    return this.getAll().filter(def => def.strategy === strategy)
  }

  /**
   * Filter projections based on context
   */
  public filter(context: ProjectionFilterContext = {}): ProjectionDefinition[] {
    let projections = this.getAll()

    // Filter by atlas
    if (context.atlasId) {
      const projectionPreferences = this.getProjectionPreferences(context.atlasId)
      const prohibitedProjections = projectionPreferences?.prohibited || []

      projections = projections.filter((def) => {
        // Exclude if prohibited in atlas config
        if (prohibitedProjections.includes(def.id)) {
          return false
        }
        return true
      })
    }

    // Filter by view mode
    if (context.viewMode) {
      projections = projections.filter((def) => {
        switch (context.viewMode) {
          case 'split':
            return def.capabilities.supportsSplit
          case 'composite-custom':
            return def.capabilities.supportsComposite
          case 'built-in-composite':
            return def.strategy === 'D3_COMPOSITE'
          case 'unified':
            return def.capabilities.supportsUnified
          default:
            return true
        }
      })
    }

    // Filter by required capabilities
    if (context.requiredCapabilities) {
      projections = projections.filter((def) => {
        const required = context.requiredCapabilities!
        return Object.keys(required).every((key) => {
          const capKey = key as keyof typeof required
          return (
            required[capKey] === undefined
            || def.capabilities[capKey] === required[capKey]
          )
        })
      })
    }

    // Exclude categories
    if (context.excludeCategories && context.excludeCategories.length > 0) {
      projections = projections.filter(
        def => !context.excludeCategories!.includes(def.category),
      )
    }

    // Filter by recommendation
    if (context.recommendedOnly) {
      const recommendations = this.recommend(context)
      const recommendedIds = new Set(
        recommendations
          .filter(rec => rec.level === 'excellent' || rec.level === 'good')
          .map(rec => rec.projection.id),
      )
      projections = projections.filter(def => recommendedIds.has(def.id))
    }

    return projections
  }

  /**
   * Recommend projections for a given context with scoring
   */
  public recommend(context: ProjectionFilterContext = {}): ProjectionRecommendation[] {
    const projections = this.filter(context)
    const recommendations: ProjectionRecommendation[] = []

    // Get atlas projection preferences if atlas ID is provided
    let atlasPreferences: ProjectionPreferences | undefined
    if (context.atlasId) {
      atlasPreferences = this.getProjectionPreferences(context.atlasId)
    }

    projections.forEach((projection) => {
      let score = 50 // Base score
      let level: ProjectionRecommendation['level'] = 'usable'
      let reason = 'projections.recommendations.general'

      // Check if projection is in atlas config recommended list
      if (atlasPreferences?.recommended?.includes(projection.id)) {
        score += 40
        level = 'excellent'
        reason = 'projections.recommendations.atlasRecommended'
      }
      // Check if projection is prohibited for this atlas (immediate disqualification)
      if (atlasPreferences?.prohibited?.includes(projection.id)) {
        score = -50 // Set to negative score for prohibited projections
        level = 'not-recommended'
        reason = 'projections.recommendations.atlasProhibited'
      }

      // Adjust for view mode compatibility
      if (context.viewMode === 'built-in-composite') {
        if (projection.strategy === 'D3_COMPOSITE') {
          score += 20
        }
      }

      // Determine final level based on score
      if (score >= 80) {
        level = 'excellent'
      }
      else if (score >= 60) {
        level = 'good'
      }
      else if (score >= 40) {
        level = 'usable'
      }
      else {
        level = 'not-recommended'
      }

      recommendations.push({
        projection,
        score,
        level,
        reason,
      })
    })

    // Sort by score (highest first)
    recommendations.sort((a, b) => b.score - a.score)

    return recommendations
  }

    public isValid(id: string): boolean {
    return this.get(id) !== undefined
  }

    public getCategories(): ProjectionCategoryType[] {
    const categories = new Set<ProjectionCategoryType>()
    this.getAll().forEach((def) => {
      categories.add(def.category)
    })
    return Array.from(categories)
  }
}

/**
 * Singleton instance export
 */
export const projectionRegistry = ProjectionRegistry.getInstance()
