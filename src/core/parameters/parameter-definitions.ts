/**
 * Parameter Definitions
 *
 * Central definitions for all projection parameters with complete metadata.
 * This file registers all parameters with the parameter registry.
 */

import type { ProjectionFamilyType } from '@/core/projections/types'
import { parameterRegistry } from './parameter-registry'

/**
 * Register all projection parameters with the parameter registry
 */
export function registerAllParameters(): void {
  // Core positioning parameters

  parameterRegistry.register({
    key: 'center',
    displayName: 'Center',
    description: 'Geographic center point [longitude, latitude]',
    type: 'tuple2',
    unit: 'degrees',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: true,
    constraints: (family: ProjectionFamilyType) => ({
      min: [-180, -90],
      max: [180, 90],
      relevant: family !== 'CONIC' && family !== 'CYLINDRICAL' && family !== 'PSEUDOCYLINDRICAL',
    }),
    relevantFor: ['AZIMUTHAL'],
  })

  parameterRegistry.register({
    key: 'rotate',
    displayName: 'Rotation',
    description: 'Three-axis rotation [lambda, phi, gamma]',
    type: 'tuple3',
    unit: 'degrees',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: true,
    constraints: {
      min: [-180, -90, -180],
      max: [180, 90, 180],
    },
    relevantFor: ['CONIC', 'CYLINDRICAL', 'PSEUDOCYLINDRICAL', 'AZIMUTHAL'],
  })

  parameterRegistry.register({
    key: 'parallels',
    displayName: 'Standard Parallels',
    description: 'Standard parallels for conic projections [south, north]',
    type: 'tuple2',
    unit: 'degrees',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: true,
    constraints: (family: ProjectionFamilyType) => ({
      min: [-90, -90],
      max: [90, 90],
      relevant: family === 'CONIC',
    }),
    relevantFor: ['CONIC'],
  })

  // Scale parameters

  parameterRegistry.register({
    key: 'baseScale',
    displayName: 'Base Scale',
    description: 'Base scale value before multiplier',
    type: 'number',
    unit: 'scale',
    source: 'preset',
    mutable: false, // Not directly user-editable
    exportable: true,
    requiresPreset: true,
    constraints: { min: 1, max: 100000 },
    relevantFor: 'all',
  })

  parameterRegistry.register({
    key: 'scaleMultiplier',
    displayName: 'Scale Multiplier',
    description: 'Scale adjustment factor',
    type: 'number',
    unit: 'multiplier',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: true,
    constraints: { min: 0.01, max: 10, step: 0.01 },
    relevantFor: 'all',
  })

  parameterRegistry.register({
    key: 'scale',
    displayName: 'Scale',
    description: 'Final scale value (computed or override)',
    type: 'number',
    unit: 'scale',
    source: 'computed', // Computed from baseScale * scaleMultiplier
    mutable: true, // Can override
    exportable: true,
    requiresPreset: false,
    constraints: { min: 1, max: 100000, step: 1 },
    relevantFor: 'all',
    computeDefault: (_territory) => {
      // This is a fallback - normally computed from other parameters
      return 2700
    },
  })

  // Translation parameters

  parameterRegistry.register({
    key: 'translateOffset',
    displayName: 'Layout Position',
    description: 'Territory position offset from map center [x, y]',
    type: 'tuple2',
    unit: 'pixels',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: true,
    constraints: { min: [-2000, -2000], max: [2000, 2000] },
    relevantFor: 'all',
  })

  parameterRegistry.register({
    key: 'translate',
    displayName: 'Translation Adjustment',
    description: 'Additional translation on top of layout position [x, y]',
    type: 'tuple2',
    unit: 'pixels',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: false,
    constraints: { min: [-1000, -1000], max: [1000, 1000], step: 10 },
    relevantFor: 'all',
    defaultValue: [0, 0],
  })

  // Advanced parameters

  parameterRegistry.register({
    key: 'clipAngle',
    displayName: 'Clip Angle',
    description: 'Clipping angle for azimuthal projections',
    type: 'number',
    unit: 'degrees',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: false,
    constraints: (family: ProjectionFamilyType) => ({
      min: 0,
      max: 180,
      step: 1,
      relevant: family === 'AZIMUTHAL',
    }),
    relevantFor: ['AZIMUTHAL'],
    defaultValue: 90,
  })

  parameterRegistry.register({
    key: 'precision',
    displayName: 'Precision',
    description: 'Adaptive sampling precision',
    type: 'number',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: false,
    constraints: { min: 0.01, max: 10, step: 0.01 },
    relevantFor: 'all',
    defaultValue: 0.1,
  })

  // NOTE: clipExtent is a special case - nested array structure
  // It's handled separately in the composite projection system
  // and not included in the standard parameter registry for now
}
