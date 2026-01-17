/**
 * ProjectionSelection Value Object
 *
 * Immutable value object representing a selected projection with its family.
 * Encapsulates validation and behavior related to projection selection.
 *
 * DDD Pattern: Value Object
 * - Immutable (all properties readonly)
 * - Equality by value (equals method)
 * - Self-validating (constructor validation)
 * - Encapsulates domain behavior (isFromFamily, etc.)
 */

import type { ProjectionFamilyType } from './types'
import type { ProjectionId } from '@/types/branded'
import { ProjectionFamily } from './types'

/**
 * Domain error for invalid projection selection
 */
export class InvalidProjectionSelectionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidProjectionSelectionError'
  }
}

/**
 * ProjectionSelection Value Object
 *
 * Represents a valid projection selection with its mathematical family.
 * Use this instead of raw string IDs for type safety and domain behavior.
 */
export class ProjectionSelection {
  readonly projectionId: ProjectionId
  readonly family: ProjectionFamilyType

  /**
   * Create a new ProjectionSelection
   *
   * @param projectionId - The projection identifier (e.g., 'mercator', 'azimuthal-equal-area')
   * @param family - The mathematical family of the projection
   * @throws InvalidProjectionSelectionError if projectionId is empty
   */
  constructor(projectionId: ProjectionId, family: ProjectionFamilyType) {
    if (!projectionId || projectionId.trim() === '') {
      throw new InvalidProjectionSelectionError('Projection ID is required')
    }
    this.projectionId = projectionId
    this.family = family
  }

  /**
   * Check equality with another ProjectionSelection
   *
   * Value objects are equal when their values are equal.
   *
   * @param other - Another ProjectionSelection to compare
   * @returns true if both have the same projectionId
   */
  equals(other: ProjectionSelection): boolean {
    return this.projectionId === other.projectionId
  }

  /**
   * Check if this projection belongs to a specific family
   *
   * @param family - The family to check against
   * @returns true if this projection is from the specified family
   */
  isFromFamily(family: ProjectionFamilyType): boolean {
    return this.family === family
  }

  /**
   * Check if this projection supports rotation (panning)
   *
   * Azimuthal, cylindrical, and pseudocylindrical projections support rotation.
   *
   * @returns true if rotation is supported
   */
  supportsRotation(): boolean {
    return (
      this.family === ProjectionFamily.AZIMUTHAL
      || this.family === ProjectionFamily.CYLINDRICAL
      || this.family === ProjectionFamily.PSEUDOCYLINDRICAL
    )
  }

  /**
   * Check if this projection supports latitude rotation
   *
   * Only azimuthal projections fully support latitude rotation.
   *
   * @returns true if latitude rotation is supported
   */
  supportsLatitudeRotation(): boolean {
    return this.family === ProjectionFamily.AZIMUTHAL
  }

  /**
   * Check if this projection uses parallels (conic projections)
   *
   * @returns true if this projection uses parallel configuration
   */
  usesParallels(): boolean {
    return this.family === ProjectionFamily.CONIC
  }

  /**
   * Check if this projection is a composite projection
   *
   * @returns true if this is a composite projection type
   */
  isComposite(): boolean {
    return this.family === ProjectionFamily.COMPOSITE
  }

  toString(): string {
    return `ProjectionSelection(${this.projectionId}, ${this.family})`
  }

  static fromRegistry(
    projectionId: ProjectionId,
    registry: { get: (id: string) => { family: ProjectionFamilyType } | undefined },
  ): ProjectionSelection | null {
    const definition = registry.get(projectionId)
    if (!definition) {
      return null
    }
    return new ProjectionSelection(projectionId, definition.family)
  }
}
