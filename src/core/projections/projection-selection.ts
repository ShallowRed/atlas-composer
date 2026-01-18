import type { ProjectionFamilyType } from './types'
import type { ProjectionId } from '@/types/branded'
import { ProjectionFamily } from './types'

export class InvalidProjectionSelectionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidProjectionSelectionError'
  }
}

export class ProjectionSelection {
  readonly projectionId: ProjectionId
  readonly family: ProjectionFamilyType

  constructor(projectionId: ProjectionId, family: ProjectionFamilyType) {
    if (!projectionId || projectionId.trim() === '') {
      throw new InvalidProjectionSelectionError('Projection ID is required')
    }
    this.projectionId = projectionId
    this.family = family
  }

  equals(other: ProjectionSelection): boolean {
    return this.projectionId === other.projectionId
  }

  isFromFamily(family: ProjectionFamilyType): boolean {
    return this.family === family
  }

  supportsRotation(): boolean {
    return (
      this.family === ProjectionFamily.AZIMUTHAL
      || this.family === ProjectionFamily.CYLINDRICAL
      || this.family === ProjectionFamily.PSEUDOCYLINDRICAL
    )
  }

  supportsLatitudeRotation(): boolean {
    return this.family === ProjectionFamily.AZIMUTHAL
  }

  usesParallels(): boolean {
    return this.family === ProjectionFamily.CONIC
  }

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
