import { describe, expect, it } from 'vitest'

import { ProjectionFactory } from '../factory'
import { projectionRegistry } from '../registry'
import { ProjectionStrategy } from '../types'

describe('registry + factory integration', () => {
  describe('full workflow: filter → recommend → create', () => {
    it('should create projections from filtered results', () => {
      const filtered = projectionRegistry.filter({
        atlasId: 'france',
        viewMode: 'split',
      })

      expect(filtered.length).toBeGreaterThan(0)

      filtered.forEach((definition) => {
        const projection = ProjectionFactory.create({ projection: definition })
        expect(projection).toBeDefined()
      })
    })

    it('should create projections from recommendations', () => {
      const recommendations = projectionRegistry.recommend({
        atlasId: 'france',
        viewMode: 'split',
      })

      expect(recommendations.length).toBeGreaterThan(0)

      recommendations.forEach((recommendation) => {
        const projection = ProjectionFactory.create({
          projection: recommendation.projection,
        })
        expect(projection).toBeDefined()
        expect(typeof projection).toBe('function')
      })
    })

    it('should use top recommendation for france atlas', () => {
      const recommendations = projectionRegistry.recommend({
        atlasId: 'france',
        viewMode: 'split',
      })

      expect(recommendations.length).toBeGreaterThan(0)
      const topRecommendation = recommendations[0]
      expect(topRecommendation).toBeDefined()

      const projection = ProjectionFactory.create({
        projection: topRecommendation!.projection,
      })
      expect(projection).toBeDefined()

      // Should be able to project French coordinates
      const result = projection!([2, 46])
      expect(result).toBeDefined()
    })

    it('should use top recommendation for portugal atlas', () => {
      const recommendations = projectionRegistry.recommend({
        atlasId: 'portugal',
        viewMode: 'split',
      })

      expect(recommendations.length).toBeGreaterThan(0)
      const topRecommendation = recommendations[0]
      expect(topRecommendation).toBeDefined()

      const projection = ProjectionFactory.create({
        projection: topRecommendation!.projection,
      })
      expect(projection).toBeDefined()

      // Should be able to project Portuguese coordinates
      const result = projection!([-8, 39])
      expect(result).toBeDefined()
    })

    it('should use top recommendation for europe atlas', () => {
      const recommendations = projectionRegistry.recommend({
        atlasId: 'europe',
        viewMode: 'split',
      })

      expect(recommendations.length).toBeGreaterThan(0)
      const topRecommendation = recommendations[0]
      expect(topRecommendation).toBeDefined()

      const projection = ProjectionFactory.create({
        projection: topRecommendation!.projection,
      })
      expect(projection).toBeDefined()

      // Should be able to project European coordinates
      const result = projection!([10, 50])
      expect(result).toBeDefined()
    })
  })

  describe('strategy-specific workflows', () => {
    it('should create all D3 builtin projections from registry', () => {
      const builtinProjections = projectionRegistry.getByStrategy(
        ProjectionStrategy.D3_BUILTIN,
      )

      expect(builtinProjections.length).toBeGreaterThan(0)

      builtinProjections.forEach((definition) => {
        const projection = ProjectionFactory.create({ projection: definition })
        expect(projection).toBeDefined()
        expect(typeof projection).toBe('function')
      })
    })

    it('should create all D3 composite projections from registry', () => {
      const compositeProjections = projectionRegistry.getByStrategy(
        ProjectionStrategy.D3_COMPOSITE,
      )

      expect(compositeProjections.length).toBeGreaterThan(0)

      compositeProjections.forEach((definition) => {
        const projection = ProjectionFactory.create({ projection: definition })
        expect(projection).toBeDefined()
        expect(typeof projection).toBe('function')
      })
    })
  })

  describe('category-specific workflows', () => {
    it('should create conic projections from registry', () => {
      const conicProjections = projectionRegistry.getByCategory('CONIC')

      expect(conicProjections.length).toBeGreaterThan(0)

      conicProjections.forEach((definition) => {
        const projection = ProjectionFactory.create({ projection: definition })
        expect(projection).toBeDefined()
      })
    })

    it('should create cylindrical projections from registry', () => {
      const cylindricalProjections = projectionRegistry.getByCategory('CYLINDRICAL')

      expect(cylindricalProjections.length).toBeGreaterThan(0)

      cylindricalProjections.forEach((definition) => {
        const projection = ProjectionFactory.create({ projection: definition })
        expect(projection).toBeDefined()
      })
    })

    it('should create composite projections from registry', () => {
      const compositeProjections = projectionRegistry.getByCategory('COMPOSITE')

      expect(compositeProjections.length).toBeGreaterThan(0)

      compositeProjections.forEach((definition) => {
        const projection = ProjectionFactory.create({ projection: definition })
        expect(projection).toBeDefined()
        expect(typeof projection).toBe('function')
      })
    })
  })

  describe('projection parameter application', () => {
    it('should apply parameters to projections from registry', () => {
      const definition = projectionRegistry.get('mercator')
      expect(definition).toBeDefined()

      const projection = ProjectionFactory.create({
        projection: definition!,
        parameters: {
          scale: 1000,
          center: [2, 46],
          translate: [500, 300],
        },
      })

      expect(projection).toBeDefined()
      expect(projection!.scale()).toBe(1000)
      expect(projection!.center()).toEqual([2, 46])
      expect(projection!.translate()).toEqual([500, 300])
    })

    it('should apply default parameters from definition', () => {
      // Use a non-composite projection for this test
      const definition = projectionRegistry.get('mercator')
      expect(definition).toBeDefined()

      const projection = ProjectionFactory.create({
        projection: definition!,
      })

      expect(projection).toBeDefined()

      // Should have projection methods available
      if (definition!.defaultParameters?.center && typeof projection!.center === 'function') {
        expect(projection!.center()).toBeDefined()
      }
    })
  })

  describe('createById with registry lookup', () => {
    it('should create projection from registry by ID', () => {
      // Verify the projection exists in registry
      const definition = projectionRegistry.get('mercator')
      expect(definition).toBeDefined()

      // Create using convenience method
      const projection = ProjectionFactory.createById('mercator')
      expect(projection).toBeDefined()
      expect(typeof projection).toBe('function')
    })

    it('should create projection from registry by alias', () => {
      // Verify the projection exists in registry
      const definition = projectionRegistry.get('conicConformal')
      expect(definition).toBeDefined()

      // Create using convenience method
      const projection = ProjectionFactory.createById('conicConformal')
      expect(projection).toBeDefined()
      expect(typeof projection).toBe('function')
    })

    it('should return null for unknown projection', () => {
      // Verify the projection does not exist in registry
      const definition = projectionRegistry.get('unknown-projection')
      expect(definition).toBeUndefined()

      // Create using convenience method should return null
      const projection = ProjectionFactory.createById('unknown-projection')
      expect(projection).toBeNull()
    })
  })

  describe('real-world scenarios', () => {
    it('should support complete france atlas workflow', () => {
      // 1. Get recommendations for France
      const recommendations = projectionRegistry.recommend({
        atlasId: 'france',
        viewMode: 'split',
      })

      expect(recommendations.length).toBeGreaterThan(0)

      // 2. Get top recommendation (should be atlas-specific conic-conformal)
      const topRecommendation = recommendations[0]
      expect(topRecommendation).toBeDefined()
      expect(topRecommendation!.projection.id).toBe('conic-conformal-france')

      // 3. Create projection from recommendation
      const projection = ProjectionFactory.create({
        projection: topRecommendation!.projection,
      })
      expect(projection).toBeDefined()

      // 4. Use projection for French territories
      const metropolitanFrance = projection!([2, 46])
      expect(metropolitanFrance).toBeDefined()

      const guadeloupe = projection!([-61.5, 16.25])
      expect(guadeloupe).toBeDefined()

      const reunion = projection!([55.5, -21])
      expect(reunion).toBeDefined()
    })

    it('should support complete portugal atlas workflow', () => {
      // 1. Get recommendations for Portugal
      const recommendations = projectionRegistry.recommend({
        atlasId: 'portugal',
        viewMode: 'split',
      })

      expect(recommendations.length).toBeGreaterThan(0)

      // 2. Get top recommendation (should be base conic-conformal, not the composite variant)
      const topRecommendation = recommendations[0]
      expect(topRecommendation).toBeDefined()
      expect(topRecommendation!.projection.id).toBe('conic-conformal-portugal')

      // 3. Create projection from recommendation
      const projection = ProjectionFactory.create({
        projection: topRecommendation!.projection,
      })
      expect(projection).toBeDefined()

      // 4. Use projection for Portuguese territories
      const continentalPortugal = projection!([-8, 39])
      expect(continentalPortugal).toBeDefined()

      const madeira = projection!([-16.9, 32.7])
      expect(madeira).toBeDefined()

      const azores = projection!([-25.7, 37.7])
      expect(azores).toBeDefined()
    })

    it('should support complete europe atlas workflow', () => {
      // 1. Get recommendations for Europe
      const recommendations = projectionRegistry.recommend({
        atlasId: 'europe',
        viewMode: 'split',
      })

      expect(recommendations.length).toBeGreaterThan(0)

      // 2. Get top recommendation (should be atlas-specific conic-conformal)
      const topRecommendation = recommendations[0]
      expect(topRecommendation).toBeDefined()
      expect(topRecommendation!.projection.id).toBe('conic-conformal-europe')

      // 3. Create projection from recommendation
      const projection = ProjectionFactory.create({
        projection: topRecommendation!.projection,
      })
      expect(projection).toBeDefined()

      // 4. Use projection for European territories
      const continentalEurope = projection!([10, 50])
      expect(continentalEurope).toBeDefined()

      const canaryIslands = projection!([-15.5, 28])
      expect(canaryIslands).toBeDefined()

      const guadeloupe = projection!([-61.5, 16.25])
      expect(guadeloupe).toBeDefined()
    })

    it('should handle view mode transitions', () => {
      // Split mode recommendation
      const splitRecommendations = projectionRegistry.recommend({
        atlasId: 'france',
        viewMode: 'split',
      })
      expect(splitRecommendations.length).toBeGreaterThan(0)

      const splitProjection = ProjectionFactory.create({
        projection: splitRecommendations[0]!.projection,
      })
      expect(splitProjection).toBeDefined()

      // Unified mode recommendation
      const unifiedRecommendations = projectionRegistry.recommend({
        atlasId: 'france',
        viewMode: 'unified',
      })
      expect(unifiedRecommendations.length).toBeGreaterThan(0)

      const unifiedProjection = ProjectionFactory.create({
        projection: unifiedRecommendations[0]!.projection,
      })
      expect(unifiedProjection).toBeDefined()
    })
  })
})
