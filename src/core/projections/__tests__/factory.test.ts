import { describe, expect, it } from 'vitest'

import { ProjectionFactory } from '../factory'
import { projectionRegistry } from '../registry'
import { ProjectionStrategy } from '../types'

describe('projectionFactory', () => {
  describe('create()', () => {
    it('should create a D3 builtin projection', () => {
      const definition = projectionRegistry.get('mercator')
      expect(definition).toBeDefined()

      const projection = ProjectionFactory.create({ projection: definition! })
      expect(projection).toBeDefined()
      expect(typeof projection).toBe('function')
    })

    it('should create a D3 extended projection', () => {
      const definition = projectionRegistry.get('natural-earth')
      if (definition) {
        const projection = ProjectionFactory.create({ projection: definition })
        expect(projection).toBeDefined()
        expect(typeof projection).toBe('function')
      }
    })

    it('should create a D3 composite projection', () => {
      const definition = projectionRegistry.get('conic-conformal-france')
      expect(definition).toBeDefined()

      const projection = ProjectionFactory.create({ projection: definition! })
      expect(projection).toBeDefined()
      expect(typeof projection).toBe('function')
    })

    it('should apply projection parameters', () => {
      const definition = projectionRegistry.get('mercator')
      expect(definition).toBeDefined()

      const projection = ProjectionFactory.create({
        projection: definition!,
        parameters: { scale: 1000 },
      })
      expect(projection).toBeDefined()
      expect(projection!.scale()).toBe(1000)
    })

    it('should apply center parameter', () => {
      const definition = projectionRegistry.get('mercator')
      expect(definition).toBeDefined()

      const projection = ProjectionFactory.create({
        projection: definition!,
        parameters: { center: [2, 46] },
      })
      expect(projection).toBeDefined()
      const center = projection!.center()
      expect(center).toEqual([2, 46])
    })

    it('should apply rotate parameter', () => {
      const definition = projectionRegistry.get('mercator')
      expect(definition).toBeDefined()

      const projection = ProjectionFactory.create({
        projection: definition!,
        parameters: { rotate: [10, 0, 0] },
      })
      expect(projection).toBeDefined()
      const rotate = projection!.rotate()
      expect(rotate).toEqual([10, 0, 0])
    })

    it('should apply translate parameter', () => {
      const definition = projectionRegistry.get('mercator')
      expect(definition).toBeDefined()

      const projection = ProjectionFactory.create({
        projection: definition!,
        parameters: { translate: [500, 300] },
      })
      expect(projection).toBeDefined()
      const translate = projection!.translate()
      expect(translate).toEqual([500, 300])
    })

    it('should handle projections with parallels', () => {
      const definition = projectionRegistry.get('albers')
      expect(definition).toBeDefined()

      const projection = ProjectionFactory.create({
        projection: definition!,
        parameters: { parallels: [30, 60] },
      })
      expect(projection).toBeDefined()
      const conicProjection = projection as any
      const parallels = conicProjection.parallels()
      // Use toBeCloseTo for floating point comparisons
      expect(parallels[0]).toBeCloseTo(30, 5)
      expect(parallels[1]).toBeCloseTo(60, 5)
    })
  })

  describe('createById()', () => {
    it('should create projection by ID', () => {
      const projection = ProjectionFactory.createById('mercator')
      expect(projection).toBeDefined()
      expect(typeof projection).toBe('function')
    })

    it('should create projection by alias', () => {
      const projection = ProjectionFactory.createById('conicConformal')
      expect(projection).toBeDefined()
      expect(typeof projection).toBe('function')
    })

    it('should return null for unknown projection ID', () => {
      const projection = ProjectionFactory.createById('unknown-projection')
      expect(projection).toBeNull()
    })

    it('should apply options when creating by ID', () => {
      const projection = ProjectionFactory.createById('mercator', {
        scale: 500,
      })
      expect(projection).toBeDefined()
      expect(projection!.scale()).toBe(500)
    })
  })

  describe('d3 builtin projections', () => {
    const builtinProjections = projectionRegistry
      .getByStrategy(ProjectionStrategy.D3_BUILTIN)

    it('should create all registered D3 builtin projections', () => {
      builtinProjections.forEach((definition) => {
        const projection = ProjectionFactory.create({ projection: definition })
        expect(projection).toBeDefined()
        expect(typeof projection).toBe('function')
      })
    })

    it('should create mercator projection', () => {
      const projection = ProjectionFactory.createById('mercator')
      expect(projection).toBeDefined()
      expect(projection!([0, 0])).toBeDefined()
    })

    it('should create conic-conformal projection', () => {
      const projection = ProjectionFactory.createById('conic-conformal')
      expect(projection).toBeDefined()
      expect(projection!([0, 0])).toBeDefined()
    })

    it('should create albers projection', () => {
      const projection = ProjectionFactory.createById('albers')
      expect(projection).toBeDefined()
      expect(projection!([0, 0])).toBeDefined()
    })
  })

  describe('d3 extended projections', () => {
    it('should handle extended projections gracefully', () => {
      const extendedProjections = projectionRegistry
        .getByStrategy(ProjectionStrategy.D3_EXTENDED)

      extendedProjections.forEach((definition) => {
        const projection = ProjectionFactory.create({ projection: definition })
        // Extended projections should work or return null
        expect(projection === null || typeof projection === 'function').toBe(true)
      })
    })
  })

  describe('d3 composite projections', () => {
    const compositeProjections = projectionRegistry
      .getByStrategy(ProjectionStrategy.D3_COMPOSITE)

    it('should create all composite projections', () => {
      compositeProjections.forEach((definition) => {
        const projection = ProjectionFactory.create({ projection: definition })
        expect(projection).toBeDefined()
        expect(typeof projection).toBe('function')
      })
    })

    it('should create conic-conformal-france projection', () => {
      const projection = ProjectionFactory.createById('conic-conformal-france')
      expect(projection).toBeDefined()
      expect(projection!([2, 46])).toBeDefined()
    })

    it('should create conic-conformal-portugal projection', () => {
      const projection = ProjectionFactory.createById('conic-conformal-portugal')
      expect(projection).toBeDefined()
      expect(projection!([-8, 39])).toBeDefined()
    })

    it('should create conic-conformal-europe projection', () => {
      const projection = ProjectionFactory.createById('conic-conformal-europe')
      expect(projection).toBeDefined()
      expect(projection!([10, 50])).toBeDefined()
    })
  })

  describe('projection methods', () => {
    it('should support standard projection methods', () => {
      const projection = ProjectionFactory.createById('mercator')
      expect(projection).toBeDefined()

      // Test that standard methods exist
      expect(typeof projection!.scale).toBe('function')
      expect(typeof projection!.center).toBe('function')
      expect(typeof projection!.translate).toBe('function')
      expect(typeof projection!.rotate).toBe('function')
    })

    it('should allow chaining projection methods', () => {
      const projection = ProjectionFactory.createById('mercator')
      expect(projection).toBeDefined()

      const result = projection!
        .scale(500)
        .center([2, 46])
        .translate([400, 300])

      expect(result).toBe(projection)
    })

    it('should project coordinates correctly', () => {
      const projection = ProjectionFactory.createById('mercator')
      expect(projection).toBeDefined()

      projection!
        .scale(1000)
        .translate([500, 300])

      const result = projection!([0, 0])
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result!.length).toBe(2)
    })
  })

  describe('error handling', () => {
    it('should return null for invalid options', () => {
      const result = ProjectionFactory.create(undefined as any)
      expect(result).toBeNull()
    })

    it('should return null for unknown strategy', () => {
      const invalidDefinition = {
        id: 'test',
        name: 'Test',
        category: 'test',
        family: 'test',
        strategy: 'UNKNOWN' as any,
        capabilities: { preserves: [], distorts: [] },
      }

      const result = ProjectionFactory.create({ projection: invalidDefinition as any })
      expect(result).toBeNull()
    })
  })
})
