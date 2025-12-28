/**
 * Tests for ProjectionSelection Value Object
 */

import type { ProjectionId } from '@/types'
import { describe, expect, it } from 'vitest'
import { createProjectionId } from '@/types/branded'
import { InvalidProjectionSelectionError, ProjectionSelection } from '../projection-selection'
import { ProjectionFamily } from '../types'

describe('projectionSelection', () => {
  describe('constructor', () => {
    it('should create a valid ProjectionSelection', () => {
      const selection = new ProjectionSelection(createProjectionId('mercator'), ProjectionFamily.CYLINDRICAL)

      expect(selection.projectionId).toBe('mercator')
      expect(selection.family).toBe(ProjectionFamily.CYLINDRICAL)
    })

    it('should throw error for empty projectionId', () => {
      expect(() => new ProjectionSelection('' as ProjectionId, ProjectionFamily.CYLINDRICAL))
        .toThrow(InvalidProjectionSelectionError)
    })

    it('should throw error for whitespace-only projectionId', () => {
      expect(() => new ProjectionSelection(createProjectionId('   '), ProjectionFamily.AZIMUTHAL))
        .toThrow(InvalidProjectionSelectionError)
    })
  })

  describe('equals', () => {
    it('should return true for same projectionId', () => {
      const a = new ProjectionSelection(createProjectionId('mercator'), ProjectionFamily.CYLINDRICAL)
      const b = new ProjectionSelection(createProjectionId('mercator'), ProjectionFamily.CYLINDRICAL)

      expect(a.equals(b)).toBe(true)
    })

    it('should return false for different projectionId', () => {
      const a = new ProjectionSelection(createProjectionId('mercator'), ProjectionFamily.CYLINDRICAL)
      const b = new ProjectionSelection(createProjectionId('orthographic'), ProjectionFamily.AZIMUTHAL)

      expect(a.equals(b)).toBe(false)
    })
  })

  describe('isFromFamily', () => {
    it('should return true when family matches', () => {
      const selection = new ProjectionSelection(createProjectionId('mercator'), ProjectionFamily.CYLINDRICAL)

      expect(selection.isFromFamily(ProjectionFamily.CYLINDRICAL)).toBe(true)
    })

    it('should return false when family does not match', () => {
      const selection = new ProjectionSelection(createProjectionId('mercator'), ProjectionFamily.CYLINDRICAL)

      expect(selection.isFromFamily(ProjectionFamily.CONIC)).toBe(false)
    })
  })

  describe('supportsRotation', () => {
    it('should return true for azimuthal projections', () => {
      const selection = new ProjectionSelection(createProjectionId('orthographic'), ProjectionFamily.AZIMUTHAL)
      expect(selection.supportsRotation()).toBe(true)
    })

    it('should return true for cylindrical projections', () => {
      const selection = new ProjectionSelection(createProjectionId('mercator'), ProjectionFamily.CYLINDRICAL)
      expect(selection.supportsRotation()).toBe(true)
    })

    it('should return true for pseudocylindrical projections', () => {
      const selection = new ProjectionSelection(createProjectionId('mollweide'), ProjectionFamily.PSEUDOCYLINDRICAL)
      expect(selection.supportsRotation()).toBe(true)
    })

    it('should return false for conic projections', () => {
      const selection = new ProjectionSelection(createProjectionId('conic-conformal'), ProjectionFamily.CONIC)
      expect(selection.supportsRotation()).toBe(false)
    })
  })

  describe('supportsLatitudeRotation', () => {
    it('should return true only for azimuthal projections', () => {
      const azimuthal = new ProjectionSelection(createProjectionId('orthographic'), ProjectionFamily.AZIMUTHAL)
      const cylindrical = new ProjectionSelection(createProjectionId('mercator'), ProjectionFamily.CYLINDRICAL)

      expect(azimuthal.supportsLatitudeRotation()).toBe(true)
      expect(cylindrical.supportsLatitudeRotation()).toBe(false)
    })
  })

  describe('usesParallels', () => {
    it('should return true for conic projections', () => {
      const selection = new ProjectionSelection(createProjectionId('conic-conformal'), ProjectionFamily.CONIC)
      expect(selection.usesParallels()).toBe(true)
    })

    it('should return false for non-conic projections', () => {
      const selection = new ProjectionSelection(createProjectionId('mercator'), ProjectionFamily.CYLINDRICAL)
      expect(selection.usesParallels()).toBe(false)
    })
  })

  describe('isComposite', () => {
    it('should return true for composite projections', () => {
      const selection = new ProjectionSelection(createProjectionId('france-composite'), ProjectionFamily.COMPOSITE)
      expect(selection.isComposite()).toBe(true)
    })

    it('should return false for non-composite projections', () => {
      const selection = new ProjectionSelection(createProjectionId('mercator'), ProjectionFamily.CYLINDRICAL)
      expect(selection.isComposite()).toBe(false)
    })
  })

  describe('toString', () => {
    it('should return a readable string representation', () => {
      const selection = new ProjectionSelection(createProjectionId('mercator'), ProjectionFamily.CYLINDRICAL)
      expect(selection.toString()).toBe('ProjectionSelection(mercator, CYLINDRICAL)')
    })
  })

  describe('fromRegistry', () => {
    it('should create ProjectionSelection from registry lookup', () => {
      const mockRegistry = {
        get: (id: string) => {
          if (id === 'mercator') {
            return { family: ProjectionFamily.CYLINDRICAL }
          }
          return undefined
        },
      }

      const selection = ProjectionSelection.fromRegistry(createProjectionId('mercator'), mockRegistry)

      expect(selection).not.toBeNull()
      expect(selection?.projectionId).toBe('mercator')
      expect(selection?.family).toBe(ProjectionFamily.CYLINDRICAL)
    })

    it('should return null for unknown projection', () => {
      const mockRegistry = {
        get: () => undefined,
      }

      const selection = ProjectionSelection.fromRegistry(createProjectionId('unknown'), mockRegistry)

      expect(selection).toBeNull()
    })
  })
})
