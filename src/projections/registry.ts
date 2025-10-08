/**
 * Projection Registry
 * 
 * Singleton registry that manages all projection definitions and provides
 * methods for querying, filtering, and recommending projections based on
 * geographic context.
 */

import type {
  ProjectionCategoryType,
  ProjectionDefinition,
  ProjectionFilterContext,
  ProjectionRecommendation,
  ProjectionStrategyType,
} from './types'
import { ALL_PROJECTIONS } from './definitions'

/**
 * Projection Registry Class
 * Manages all projection definitions with filtering and recommendation capabilities
 */
class ProjectionRegistry {
  private definitions: Map<string, ProjectionDefinition>
  private static instance: ProjectionRegistry

  private constructor() {
    this.definitions = new Map()
    this.registerAll()
  }

  /**
   * Get singleton instance
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
   * Register a projection definition with its ID and aliases
   */
  public register(definition: ProjectionDefinition): void {
    // Register by ID
    this.definitions.set(definition.id, definition)

    // Register by aliases
    if (definition.aliases) {
      definition.aliases.forEach((alias) => {
        this.definitions.set(alias, definition)
      })
    }
  }

  /**
   * Get a projection definition by ID or alias
   */
  public get(id: string): ProjectionDefinition | undefined {
    return this.definitions.get(id)
  }

  /**
   * Get all projection definitions (deduplicated)
   */
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

  /**
   * Get projections by category
   */
  public getByCategory(category: ProjectionCategoryType): ProjectionDefinition[] {
    return this.getAll().filter((def) => def.category === category)
  }

  /**
   * Get projections by strategy
   */
  public getByStrategy(strategy: ProjectionStrategyType): ProjectionDefinition[] {
    return this.getAll().filter((def) => def.strategy === strategy)
  }

  /**
   * Filter projections based on context
   */
  public filter(context: ProjectionFilterContext = {}): ProjectionDefinition[] {
    let projections = this.getAll()

    // Filter by atlas
    if (context.atlasId) {
      projections = projections.filter((def) => {
        // Include if recommended for this atlas
        if (
          def.suitability.recommendedForAtlases?.includes(context.atlasId!)
        ) {
          return true
        }
        // Exclude if explicitly avoided for this atlas
        if (def.suitability.avoidForAtlases?.includes(context.atlasId!)) {
          return false
        }
        // Include if no specific atlas preference
        return (
          !def.suitability.recommendedForAtlases ||
          def.suitability.recommendedForAtlases.length === 0
        )
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
          case 'composite-existing':
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
            required[capKey] === undefined ||
            def.capabilities[capKey] === required[capKey]
          )
        })
      })
    }

    // Exclude categories
    if (context.excludeCategories && context.excludeCategories.length > 0) {
      projections = projections.filter(
        (def) => !context.excludeCategories!.includes(def.category),
      )
    }

    // Filter by recommendation
    if (context.recommendedOnly) {
      const recommendations = this.recommend(context)
      const recommendedIds = new Set(
        recommendations
          .filter((rec) => rec.level === 'excellent' || rec.level === 'good')
          .map((rec) => rec.projection.id),
      )
      projections = projections.filter((def) => recommendedIds.has(def.id))
    }

    return projections
  }

  /**
   * Recommend projections for a given context with scoring
   */
  public recommend(context: ProjectionFilterContext = {}): ProjectionRecommendation[] {
    const projections = this.filter(context)
    const recommendations: ProjectionRecommendation[] = []

    projections.forEach((projection) => {
      let score = 50 // Base score
      let level: ProjectionRecommendation['level'] = 'usable'
      let reason = 'projections.recommendations.general'

      // Check atlas match
      if (
        context.atlasId &&
        projection.suitability.recommendedForAtlases?.includes(context.atlasId)
      ) {
        score += 30
        reason = 'projections.recommendations.atlasOptimized'
      }

      // Check territory context
      if (context.territory) {
        // Check excellent suitability
        if (
          projection.suitability.excellent?.some(
            (ctx) => ctx.territoryType === context.territory!.type,
          )
        ) {
          score += 30
          level = 'excellent'
          reason = 'projections.recommendations.territoryExcellent'
        }
        // Check good suitability
        else if (
          projection.suitability.good?.some(
            (ctx) => ctx.territoryType === context.territory!.type,
          )
        ) {
          score += 20
          level = 'good'
          reason = 'projections.recommendations.territoryGood'
        }
        // Check usable suitability
        else if (
          projection.suitability.usable?.some(
            (ctx) => ctx.territoryType === context.territory!.type,
          )
        ) {
          score += 10
          level = 'usable'
        }
        // Check if should be avoided
        else if (
          projection.suitability.avoid?.some(
            (ctx) => ctx.territoryType === context.territory!.type,
          )
        ) {
          score -= 40
          level = 'not-recommended'
          reason = 'projections.recommendations.notSuitable'
        }
      }

      // Adjust for view mode compatibility
      if (context.viewMode === 'composite-existing') {
        if (projection.strategy === 'D3_COMPOSITE') {
          score += 20
        }
      }

      // Determine final level based on score
      if (score >= 80) {
        level = 'excellent'
      } else if (score >= 60) {
        level = 'good'
      } else if (score >= 40) {
        level = 'usable'
      } else {
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

  /**
   * Check if a projection ID is valid
   */
  public isValid(id: string): boolean {
    return this.definitions.has(id)
  }

  /**
   * Get all available categories
   */
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
