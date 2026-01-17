import { describe, expect, it } from 'vitest'
import { TerritoryVisibilityService } from '../territory-visibility-service'

describe('territoryVisibilityService', () => {
  describe('shouldShowEmptyState', () => {
    it('should return false when territories exist', () => {
      const result = TerritoryVisibilityService.shouldShowEmptyState({
        territoryCount: 2,
      })

      expect(result).toBe(false)
    })

    it('should return true when no territories', () => {
      const result = TerritoryVisibilityService.shouldShowEmptyState({
        territoryCount: 0,
      })

      expect(result).toBe(true)
    })

    it('should return false when no territories but primary in active', () => {
      const result = TerritoryVisibilityService.shouldShowEmptyState({
        territoryCount: 0,
        hasMainlandInActiveTerritories: true,
      })

      expect(result).toBe(false)
    })
  })

  describe('hasTerritoryInList', () => {
    it('should return true when territory is in the list', () => {
      const result = TerritoryVisibilityService.hasTerritoryInList(
        ['FR-MET', 'FR-GP', 'FR-MQ'],
        'FR-MET',
      )
      expect(result).toBe(true)
    })

    it('should return false when territory is not in the list', () => {
      const result = TerritoryVisibilityService.hasTerritoryInList(
        ['FR-GP', 'FR-MQ'],
        'FR-MET',
      )
      expect(result).toBe(false)
    })

    it('should return false for empty list', () => {
      const result = TerritoryVisibilityService.hasTerritoryInList(
        [],
        'FR-MET',
      )
      expect(result).toBe(false)
    })

    it('should handle case-sensitive matching', () => {
      const result = TerritoryVisibilityService.hasTerritoryInList(
        ['fr-met'],
        'FR-MET',
      )
      expect(result).toBe(false)
    })
  })
})
