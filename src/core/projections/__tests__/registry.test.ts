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
    it('should filter projections by atlas', () => {
      const franceProjections = projectionRegistry.filter({
        atlasId: 'france',
      })
      expect(franceProjections.length).toBeGreaterThan(0)
    })

    it('should filter projections by view mode', () => {
      const compositeProjections = projectionRegistry.filter({
        atlasId: 'france',
        viewMode: 'built-in-composite',
      })
      expect(compositeProjections.length).toBeGreaterThan(0)
      compositeProjections.forEach((proj) => {
        expect(proj.capabilities.supportsUnified).toBe(true)
      })
    })

    it('should exclude categories when specified', () => {
      const projections = projectionRegistry.filter({
        atlasId: 'france',
        excludeCategories: [ProjectionCategory.COMPOSITE],
      })
      projections.forEach((proj) => {
        expect(proj.category).not.toBe(ProjectionCategory.COMPOSITE)
      })
    })

    it('should return empty array for unknown atlas', () => {
      const projections = projectionRegistry.filter({
        atlasId: 'unknown-atlas',
      })
      expect(Array.isArray(projections)).toBe(true)
    })
  })

  describe('recommend()', () => {
    it('should return recommendations sorted by score', () => {
      const recommendations = projectionRegistry.recommend({
        atlasId: 'france',
      })
      expect(recommendations.length).toBeGreaterThan(0)

      // Check that scores are sorted in descending order
      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i - 1]!.score).toBeGreaterThanOrEqual(recommendations[i]!.score)
      }
    })

    it('should include projection, score, level, and reason', () => {
      const recommendations = projectionRegistry.recommend({
        atlasId: 'france',
      })
      recommendations.forEach((rec) => {
        expect(rec.projection).toBeDefined()
        expect(typeof rec.score).toBe('number')
        expect(rec.level).toBeDefined()
        expect(rec.reason).toBeDefined()
      })
    })

    it('should prioritize atlas-recommended projections', () => {
      const recommendations = projectionRegistry.recommend({
        atlasId: 'france',
      })
      const topRecommendation = recommendations[0]
      expect(topRecommendation).toBeDefined()
      expect(topRecommendation!.score).toBeGreaterThan(30)
    })

    it.skip('should penalize prohibited projections', () => {
      // NOTE: This test is skipped because the registry currently uses fallback defaults
      // where prohibited arrays are empty. The real prohibited projections would be loaded
      // by AtlasMetadataService in the full application context.
      const recommendations = projectionRegistry.recommend({
        atlasId: 'france',
      })
      const prohibitedProj = recommendations.find(r =>
        r.projection.id === 'gnomonic' || r.projection.id === 'orthographic',
      )
      if (prohibitedProj) {
        expect(prohibitedProj.score).toBeLessThan(0)
      }
    })

    it('should assign recommendation levels correctly', () => {
      const recommendations = projectionRegistry.recommend({
        atlasId: 'france',
      })

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

  describe('isValid()', () => {
    it('should return true for valid projection IDs', () => {
      expect(projectionRegistry.isValid('mercator')).toBe(true)
      expect(projectionRegistry.isValid('conic-conformal')).toBe(true)
      expect(projectionRegistry.isValid('conic-conformal-france')).toBe(true)
    })

    it('should return true for valid aliases', () => {
      expect(projectionRegistry.isValid('conicConformal')).toBe(true)
    })

    it('should return false for invalid projection IDs', () => {
      expect(projectionRegistry.isValid('invalid-projection')).toBe(false)
      expect(projectionRegistry.isValid('')).toBe(false)
    })
  })

  describe('getCategories()', () => {
    it('should return all projection categories', () => {
      const categories = projectionRegistry.getCategories()
      expect(categories).toContain(ProjectionCategory.COMPOSITE)
      expect(categories).toContain(ProjectionCategory.CONIC)
      expect(categories).toContain(ProjectionCategory.CYLINDRICAL)
    })

    it('should not contain duplicates', () => {
      const categories = projectionRegistry.getCategories()
      const uniqueCategories = [...new Set(categories)]
      expect(categories.length).toBe(uniqueCategories.length)
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
