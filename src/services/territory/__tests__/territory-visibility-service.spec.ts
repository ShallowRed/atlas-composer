import { describe, expect, it } from 'vitest'
import { TerritoryVisibilityService } from '../territory-visibility-service'

describe('territoryVisibilityService', () => {
  describe('shouldShowEmptyState', () => {
    it('should return false when territories exist', () => {
      const result = TerritoryVisibilityService.shouldShowEmptyState({
        territoryCount: 2,
        atlasPattern: 'single-focus',
        hasMainlandInActiveTerritories: false,
      })

      expect(result).toBe(false)
    })

    it('should return true when no territories and equal-members pattern (no mainland)', () => {
      const result = TerritoryVisibilityService.shouldShowEmptyState({
        territoryCount: 0,
        atlasPattern: 'equal-members',
        hasMainlandInActiveTerritories: false,
      })

      expect(result).toBe(true)
    })

    it('should return false when no territories but single-focus pattern (shows mainland)', () => {
      const result = TerritoryVisibilityService.shouldShowEmptyState({
        territoryCount: 0,
        atlasPattern: 'single-focus',
        hasMainlandInActiveTerritories: false,
      })

      expect(result).toBe(false)
    })

    it('should return false when mainland is in active territories', () => {
      const result = TerritoryVisibilityService.shouldShowEmptyState({
        territoryCount: 0,
        atlasPattern: 'equal-members', // Even though pattern doesn't show mainland
        hasMainlandInActiveTerritories: true, // Mainland explicitly in list
      })

      expect(result).toBe(false)
    })

    it('should return true when no territories and hierarchical pattern (no mainland)', () => {
      const result = TerritoryVisibilityService.shouldShowEmptyState({
        territoryCount: 0,
        atlasPattern: 'hierarchical',
        hasMainlandInActiveTerritories: false,
      })

      expect(result).toBe(true)
    })

    it('should return false when single territory and mainland in list', () => {
      const result = TerritoryVisibilityService.shouldShowEmptyState({
        territoryCount: 1,
        atlasPattern: 'single-focus',
        hasMainlandInActiveTerritories: true,
      })

      expect(result).toBe(false)
    })
  })

  describe('shouldShowMainland', () => {
    it('should return true for single-focus pattern', () => {
      const result = TerritoryVisibilityService.shouldShowMainland('single-focus')
      expect(result).toBe(true)
    })

    it('should return false for equal-members pattern', () => {
      const result = TerritoryVisibilityService.shouldShowMainland('equal-members')
      expect(result).toBe(false)
    })

    it('should return false for hierarchical pattern', () => {
      const result = TerritoryVisibilityService.shouldShowMainland('hierarchical')
      expect(result).toBe(false)
    })
  })

  describe('hasMainlandInList', () => {
    it('should return true when mainland is in the list', () => {
      const result = TerritoryVisibilityService.hasMainlandInList(
        ['FR-MET', 'FR-GP', 'FR-MQ'],
        'FR-MET',
      )
      expect(result).toBe(true)
    })

    it('should return false when mainland is not in the list', () => {
      const result = TerritoryVisibilityService.hasMainlandInList(
        ['FR-GP', 'FR-MQ'],
        'FR-MET',
      )
      expect(result).toBe(false)
    })

    it('should return false for empty list', () => {
      const result = TerritoryVisibilityService.hasMainlandInList(
        [],
        'FR-MET',
      )
      expect(result).toBe(false)
    })

    it('should handle case-sensitive matching', () => {
      const result = TerritoryVisibilityService.hasMainlandInList(
        ['fr-met'],
        'FR-MET',
      )
      expect(result).toBe(false)
    })
  })
})
