/**
 * Tests for ViewModeSelection Value Object
 */

import { describe, expect, it } from 'vitest'
import { InvalidViewModeError, isViewMode, ViewModeSelection } from '../view-mode-selection'

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

  describe('isViewMode', () => {
    it('accepts each view mode', () => {
      expect(['composite-custom', 'built-in-composite', 'split', 'unified'].every(isViewMode)).toBe(true)
    })

    it.each(['nowhere', 'toString', 1, undefined])('refuses %s', (value) => {
      expect(isViewMode(value)).toBe(false)
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
})
