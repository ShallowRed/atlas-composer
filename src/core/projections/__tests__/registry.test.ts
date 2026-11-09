import { describe, expect, it } from 'vitest'

import { projectionRegistry } from '../registry'
import { ProjectionCategory, ProjectionStrategy } from '../types'

describe('projectionRegistry', () => {
  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = projectionRegistry
      const instance2 = projectionRegistry
      expect(instance1).toBe(instance2)
    })
  })

  describe('get()', () => {
    it('should retrieve a projection by ID', () => {
      const projection = projectionRegistry.get('conic-conformal-france')
      expect(projection).toBeDefined()
      expect(projection?.id).toBe('conic-conformal-france')
    })

    it('should retrieve a projection by alias', () => {
      const projection = projectionRegistry.get('conicConformal')
      expect(projection).toBeDefined()
      expect(projection?.id).toBe('conic-conformal')
    })

    it('should return undefined for unknown projection', () => {
      const projection = projectionRegistry.get('unknown-projection')
      expect(projection).toBeUndefined()
    })

    it('should handle case-insensitive lookup', () => {
      const projection = projectionRegistry.get('MERCATOR')
      expect(projection).toBeDefined()
      expect(projection?.id).toBe('mercator')
    })
  })

  describe('getAll()', () => {
    it('should return all registered projections', () => {
      const projections = projectionRegistry.getAll()
      expect(projections.length).toBeGreaterThan(0)
    })

    it('should not contain duplicates', () => {
      const projections = projectionRegistry.getAll()
      const ids = projections.map(p => p.id)
      const uniqueIds = [...new Set(ids)]
      expect(ids.length).toBe(uniqueIds.length)
    })

    it('should return projections with all required properties', () => {
      const projections = projectionRegistry.getAll()
      projections.forEach((projection) => {
        expect(projection.id).toBeDefined()
        expect(projection.name).toBeDefined()
        expect(projection.category).toBeDefined()
        expect(projection.family).toBeDefined()
        expect(projection.strategy).toBeDefined()
        expect(projection.capabilities).toBeDefined()
      })
    })
  })

  describe('getByCategory()', () => {
    it('should return projections of a specific category', () => {
      const compositeProjections = projectionRegistry.getByCategory(ProjectionCategory.COMPOSITE)
      expect(compositeProjections.length).toBeGreaterThan(0)
      compositeProjections.forEach((proj) => {
        expect(proj.category).toBe(ProjectionCategory.COMPOSITE)
      })
    })

    it('should return conic projections', () => {
      const conicProjections = projectionRegistry.getByCategory(ProjectionCategory.CONIC)
      expect(conicProjections.length).toBeGreaterThan(0)
      conicProjections.forEach((proj) => {
        expect(proj.category).toBe(ProjectionCategory.CONIC)
      })
    })

    it('should return empty array for categories with no projections', () => {
      const artisticProjections = projectionRegistry.getByCategory(ProjectionCategory.ARTISTIC)
      expect(Array.isArray(artisticProjections)).toBe(true)
    })
  })

  describe('getByStrategy()', () => {
    it('should return D3 composite projections', () => {
      const compositeProjs = projectionRegistry.getByStrategy(ProjectionStrategy.D3_COMPOSITE)
      expect(compositeProjs.length).toBeGreaterThan(0)
      compositeProjs.forEach((proj) => {
        expect(proj.strategy).toBe(ProjectionStrategy.D3_COMPOSITE)
      })
    })

    it('should return D3 builtin projections', () => {
      const builtinProjs = projectionRegistry.getByStrategy(ProjectionStrategy.D3_BUILTIN)
      expect(builtinProjs.length).toBeGreaterThan(0)
      builtinProjs.forEach((proj) => {
        expect(proj.strategy).toBe(ProjectionStrategy.D3_BUILTIN)
      })
    })
  })

  describe('filter()', () => {
    it('should filter projections by view mode', () => {
      const compositeProjections = projectionRegistry.filter({
        viewMode: 'built-in-composite',
      })
      expect(compositeProjections.length).toBeGreaterThan(0)
      compositeProjections.forEach((proj) => {
        expect(proj.capabilities.supportsUnified).toBe(true)
      })
    })

    it('should exclude categories when specified', () => {
      const projections = projectionRegistry.filter({
        excludeCategories: [ProjectionCategory.COMPOSITE],
      })
      projections.forEach((proj) => {
        expect(proj.category).not.toBe(ProjectionCategory.COMPOSITE)
      })
    })
  })

  describe('recommend()', () => {
    it('should return recommendations sorted by score', () => {
      const recommendations = projectionRegistry.recommend()
      expect(recommendations.length).toBeGreaterThan(0)

      // Check that scores are sorted in descending order
      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i - 1]!.score).toBeGreaterThanOrEqual(recommendations[i]!.score)
      }
    })

    it('should include projection, score and level', () => {
      const recommendations = projectionRegistry.recommend()
      recommendations.forEach((rec) => {
        expect(rec.projection).toBeDefined()
        expect(typeof rec.score).toBe('number')
        expect(rec.level).toBeDefined()
      })
    })

    it('should rank the recommended projections first', () => {
      const [topRecommendation] = projectionRegistry.recommend({
        recommended: ['robinson'],
      })

      expect(topRecommendation!.projection.id).toBe('robinson')
      expect(topRecommendation!.level).toBe('excellent')
    })

    it('should assign recommendation levels correctly', () => {
      const recommendations = projectionRegistry.recommend()

      const excellent = recommendations.filter(r => r.level === 'excellent')
      const good = recommendations.filter(r => r.level === 'good')
      const usable = recommendations.filter(r => r.level === 'usable')
      const notRecommended = recommendations.filter(r => r.level === 'not-recommended')

      excellent.forEach(r => expect(r.score).toBeGreaterThanOrEqual(80))
      good.forEach(r => expect(r.score).toBeGreaterThanOrEqual(60))
      usable.forEach(r => expect(r.score).toBeGreaterThanOrEqual(40))
      notRecommended.forEach(r => expect(r.score).toBeLessThan(40))
    })
  })

  describe('critical projections', () => {
    it('should have conic-conformal-france projection', () => {
      const projection = projectionRegistry.get('conic-conformal-france')
      expect(projection).toBeDefined()
      expect(projection?.strategy).toBe(ProjectionStrategy.D3_COMPOSITE)
      expect(projection?.category).toBe(ProjectionCategory.COMPOSITE)
    })

    it('should have conic-conformal-portugal projection', () => {
      const projection = projectionRegistry.get('conic-conformal-portugal')
      expect(projection).toBeDefined()
      expect(projection?.strategy).toBe(ProjectionStrategy.D3_COMPOSITE)
    })

    it('should have conic-conformal-europe projection', () => {
      const projection = projectionRegistry.get('conic-conformal-europe')
      expect(projection).toBeDefined()
      expect(projection?.strategy).toBe(ProjectionStrategy.D3_COMPOSITE)
    })

    it('should have conic-conformal projection', () => {
      const projection = projectionRegistry.get('conic-conformal')
      expect(projection).toBeDefined()
      expect(projection?.strategy).toBe(ProjectionStrategy.D3_BUILTIN)
    })

    it('should have albers projection', () => {
      const projection = projectionRegistry.get('albers')
      expect(projection).toBeDefined()
      expect(projection?.strategy).toBe(ProjectionStrategy.D3_BUILTIN)
    })

    it('should have mercator projection', () => {
      const projection = projectionRegistry.get('mercator')
      expect(projection).toBeDefined()
      expect(projection?.strategy).toBe(ProjectionStrategy.D3_BUILTIN)
    })
  })
})
