import { describe, expect, it } from 'vitest'
import { TerritoryVisibilityService } from '../territory-visibility-service'

describe('territoryVisibilityService', () => {
  describe('shouldShowEmptyState', () => {
    it('should return false when territories exist', () => {
      const result = TerritoryVisibilityService.shouldShowEmptyState(2)

      expect(result).toBe(false)
    })

    it('should return true when no territories', () => {
      const result = TerritoryVisibilityService.shouldShowEmptyState(0)

      expect(result).toBe(true)
    })
  })
})
