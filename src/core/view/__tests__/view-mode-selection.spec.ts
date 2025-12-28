/**
 * Tests for ViewModeSelection Value Object
 */

import { describe, expect, it } from 'vitest'
import { InvalidViewModeError, ViewModeSelection } from '../view-mode-selection'

describe('viewModeSelection', () => {
  describe('constructor', () => {
    it('should create a valid ViewModeSelection for composite-custom', () => {
      const selection = new ViewModeSelection('composite-custom')
      expect(selection.mode).toBe('composite-custom')
    })

    it('should create a valid ViewModeSelection for all valid modes', () => {
      const modes = ['composite-custom', 'built-in-composite', 'split', 'unified'] as const

      modes.forEach((mode) => {
        const selection = new ViewModeSelection(mode)
        expect(selection.mode).toBe(mode)
      })
    })

    it('should throw error for invalid mode', () => {
      expect(() => new ViewModeSelection('invalid' as any))
        .toThrow(InvalidViewModeError)
    })
  })

  describe('equals', () => {
    it('should return true for same mode', () => {
      const a = new ViewModeSelection('unified')
      const b = new ViewModeSelection('unified')

      expect(a.equals(b)).toBe(true)
    })

    it('should return false for different modes', () => {
      const a = new ViewModeSelection('unified')
      const b = new ViewModeSelection('split')

      expect(a.equals(b)).toBe(false)
    })
  })

  describe('requiresCompositeProjection', () => {
    it('should return true for composite-custom', () => {
      const selection = new ViewModeSelection('composite-custom')
      expect(selection.requiresCompositeProjection()).toBe(true)
    })

    it('should return true for built-in-composite', () => {
      const selection = new ViewModeSelection('built-in-composite')
      expect(selection.requiresCompositeProjection()).toBe(true)
    })

    it('should return false for split', () => {
      const selection = new ViewModeSelection('split')
      expect(selection.requiresCompositeProjection()).toBe(false)
    })

    it('should return false for unified', () => {
      const selection = new ViewModeSelection('unified')
      expect(selection.requiresCompositeProjection()).toBe(false)
    })
  })

  describe('isCustomComposite', () => {
    it('should return true only for composite-custom', () => {
      expect(new ViewModeSelection('composite-custom').isCustomComposite()).toBe(true)
      expect(new ViewModeSelection('built-in-composite').isCustomComposite()).toBe(false)
      expect(new ViewModeSelection('split').isCustomComposite()).toBe(false)
      expect(new ViewModeSelection('unified').isCustomComposite()).toBe(false)
    })
  })

  describe('isBuiltInComposite', () => {
    it('should return true only for built-in-composite', () => {
      expect(new ViewModeSelection('built-in-composite').isBuiltInComposite()).toBe(true)
      expect(new ViewModeSelection('composite-custom').isBuiltInComposite()).toBe(false)
    })
  })

  describe('isComposite', () => {
    it('should return true for both composite modes', () => {
      expect(new ViewModeSelection('composite-custom').isComposite()).toBe(true)
      expect(new ViewModeSelection('built-in-composite').isComposite()).toBe(true)
      expect(new ViewModeSelection('split').isComposite()).toBe(false)
      expect(new ViewModeSelection('unified').isComposite()).toBe(false)
    })
  })

  describe('supportsIndividualTerritoryProjections', () => {
    it('should return true only for split mode', () => {
      expect(new ViewModeSelection('split').supportsIndividualTerritoryProjections()).toBe(true)
      expect(new ViewModeSelection('composite-custom').supportsIndividualTerritoryProjections()).toBe(false)
      expect(new ViewModeSelection('unified').supportsIndividualTerritoryProjections()).toBe(false)
    })
  })

  describe('isSplit', () => {
    it('should return true only for split', () => {
      expect(new ViewModeSelection('split').isSplit()).toBe(true)
      expect(new ViewModeSelection('unified').isSplit()).toBe(false)
    })
  })

  describe('isUnified', () => {
    it('should return true only for unified', () => {
      expect(new ViewModeSelection('unified').isUnified()).toBe(true)
      expect(new ViewModeSelection('split').isUnified()).toBe(false)
    })
  })

  describe('showsTerritoryControls', () => {
    it('should return true for split and composite-custom', () => {
      expect(new ViewModeSelection('split').showsTerritoryControls()).toBe(true)
      expect(new ViewModeSelection('composite-custom').showsTerritoryControls()).toBe(true)
      expect(new ViewModeSelection('unified').showsTerritoryControls()).toBe(false)
      expect(new ViewModeSelection('built-in-composite').showsTerritoryControls()).toBe(false)
    })
  })

  describe('showsProjectionParams', () => {
    it('should return true for unified and built-in-composite', () => {
      expect(new ViewModeSelection('unified').showsProjectionParams()).toBe(true)
      expect(new ViewModeSelection('built-in-composite').showsProjectionParams()).toBe(true)
      expect(new ViewModeSelection('split').showsProjectionParams()).toBe(false)
      expect(new ViewModeSelection('composite-custom').showsProjectionParams()).toBe(false)
    })
  })

  describe('toString', () => {
    it('should return a readable string representation', () => {
      const selection = new ViewModeSelection('unified')
      expect(selection.toString()).toBe('ViewModeSelection(unified)')
    })
  })

  describe('static methods', () => {
    it('validModes should return all valid modes', () => {
      const modes = ViewModeSelection.validModes()
      expect(modes).toContain('composite-custom')
      expect(modes).toContain('built-in-composite')
      expect(modes).toContain('split')
      expect(modes).toContain('unified')
      expect(modes).toHaveLength(4)
    })

    it('fromString should create ViewModeSelection for valid string', () => {
      const selection = ViewModeSelection.fromString('unified')
      expect(selection).not.toBeNull()
      expect(selection?.mode).toBe('unified')
    })

    it('fromString should return null for invalid string', () => {
      const selection = ViewModeSelection.fromString('invalid')
      expect(selection).toBeNull()
    })
  })
})
