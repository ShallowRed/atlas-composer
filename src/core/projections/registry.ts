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

class ProjectionRegistry {
  private definitions: Map<string, ProjectionDefinition>
  private static instance: ProjectionRegistry

  private constructor() {
    this.definitions = new Map()
    this.registerAll()
  }

  public static getInstance(): ProjectionRegistry {
    if (!ProjectionRegistry.instance) {
      ProjectionRegistry.instance = new ProjectionRegistry()
    }
    return ProjectionRegistry.instance
  }

  private registerAll(): void {
    ALL_PROJECTIONS.forEach((definition) => {
      this.register(definition)
    })
  }

  private getProjectionPreferences(atlasId: string): ProjectionPreferences {
    return getDefaultProjectionPreferences(atlasId)
  }

  public register(definition: ProjectionDefinition): void {
    this.definitions.set(definition.id, definition)

    if (definition.aliases) {
      definition.aliases.forEach((alias) => {
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

  public get(id: string): ProjectionDefinition | undefined {
    const definition = this.definitions.get(id)
    if (definition) {
      return definition
    }

    const lowerCaseId = id.toLowerCase()
    for (const [key, value] of this.definitions.entries()) {
      if (key.toLowerCase() === lowerCaseId) {
        return value
      }

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

  public filter(context: ProjectionFilterContext = {}): ProjectionDefinition[] {
    let projections = this.getAll()

    if (context.atlasId) {
      const projectionPreferences = this.getProjectionPreferences(context.atlasId)
      const prohibitedProjections = projectionPreferences?.prohibited || []

      projections = projections.filter((def) => {
        if (prohibitedProjections.includes(def.id)) {
          return false
        }
        return true
      })
    }

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

    if (context.excludeCategories && context.excludeCategories.length > 0) {
      projections = projections.filter(
        def => !context.excludeCategories!.includes(def.category),
      )
    }

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

  public recommend(context: ProjectionFilterContext = {}): ProjectionRecommendation[] {
    const projections = this.filter(context)
    const recommendations: ProjectionRecommendation[] = []

    let atlasPreferences: ProjectionPreferences | undefined
    if (context.atlasId) {
      atlasPreferences = this.getProjectionPreferences(context.atlasId)
    }

    projections.forEach((projection) => {
      let score = 50
      let level: ProjectionRecommendation['level'] = 'usable'
      let reason = 'projections.recommendations.general'

      if (atlasPreferences?.recommended?.includes(projection.id)) {
        score += 40
        level = 'excellent'
        reason = 'projections.recommendations.atlasRecommended'
      }
      if (atlasPreferences?.prohibited?.includes(projection.id)) {
        score = -50
        level = 'not-recommended'
        reason = 'projections.recommendations.atlasProhibited'
      }

      if (context.viewMode === 'built-in-composite') {
        if (projection.strategy === 'D3_COMPOSITE') {
          score += 20
        }
      }

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

export const projectionRegistry = ProjectionRegistry.getInstance()
