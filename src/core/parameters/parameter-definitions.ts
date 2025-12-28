/**
 * Parameter Definitions
 *
 * Central definitions for all projection parameters with complete metadata.
 * This file registers all parameters with the parameter registry.
 */

import { parameterRegistry } from '@/core/parameters/parameter-registry'

/**
 * Register all projection parameters with the parameter registry
 */
export function registerAllParameters(): void {
  // ==========================================================================
  // CANONICAL POSITIONING PARAMETERS (New unified format)
  // ==========================================================================
  // These are the PRIMARY positioning parameters. They represent the geographic
  // focus point in a projection-agnostic way. At render time, they are converted
  // to the appropriate D3 method (center or rotate) based on projection family.

  parameterRegistry.register({
    key: 'focusLongitude',
    displayName: 'Focus Longitude',
    description: 'Longitude of the geographic focus point. Converted to center() or rotate() based on projection family.',
    type: 'number',
    unit: 'degrees',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: false, // Derived from legacy center/rotate during loading
    familyConstraints: {
      CYLINDRICAL: { relevant: true, required: false, min: -180, max: 180, step: 0.5, defaultValue: 0 },
      PSEUDOCYLINDRICAL: { relevant: true, required: false, min: -180, max: 180, step: 0.5, defaultValue: 0 },
      CONIC: { relevant: true, required: false, min: -180, max: 180, step: 0.5, defaultValue: 0 },
      AZIMUTHAL: { relevant: true, required: false, min: -180, max: 180, step: 0.5, defaultValue: 0 },
    },
  })

  parameterRegistry.register({
    key: 'focusLatitude',
    displayName: 'Focus Latitude',
    description: 'Latitude of the geographic focus point. Converted to center() or rotate() based on projection family.',
    type: 'number',
    unit: 'degrees',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: false, // Derived from legacy center/rotate during loading
    familyConstraints: {
      CYLINDRICAL: { relevant: true, required: false, min: -90, max: 90, step: 0.5, defaultValue: 0 },
      PSEUDOCYLINDRICAL: { relevant: true, required: false, min: -90, max: 90, step: 0.5, defaultValue: 0 },
      CONIC: { relevant: true, required: false, min: -90, max: 90, step: 0.5, defaultValue: 0 },
      AZIMUTHAL: { relevant: true, required: false, min: -90, max: 90, step: 0.5, defaultValue: 0 },
    },
  })

  parameterRegistry.register({
    key: 'rotateGamma',
    displayName: 'Rotation Gamma',
    description: 'Third rotation axis (roll/tilt). Only used by projections that support 3-axis rotation.',
    type: 'number',
    unit: 'degrees',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: false,
    familyConstraints: {
      CYLINDRICAL: { relevant: false, required: false, min: -180, max: 180, step: 1, defaultValue: 0 },
      PSEUDOCYLINDRICAL: { relevant: true, required: false, min: -180, max: 180, step: 1, defaultValue: 0 },
      CONIC: { relevant: true, required: false, min: -180, max: 180, step: 1, defaultValue: 0 },
      AZIMUTHAL: { relevant: true, required: false, min: -180, max: 180, step: 1, defaultValue: 0 },
    },
  })

  // ==========================================================================
  // LEGACY POSITIONING PARAMETERS (Deprecated - for backward compatibility)
  // ==========================================================================
  // These parameters are kept for backward compatibility with existing presets.
  // New code should use focusLongitude/focusLatitude instead.
  // During preset loading, center/rotate are converted to canonical format.

  parameterRegistry.register({
    key: 'center',
    displayName: 'Center (Legacy)',
    description: '[DEPRECATED] Geographic center point [longitude, latitude]. Use focusLongitude/focusLatitude instead.',
    type: 'tuple2',
    unit: 'degrees',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: true,
    familyConstraints: {
      CYLINDRICAL: {
        relevant: true,
        required: false,
        min: [-180, -90],
        max: [180, 90],
        defaultValue: [0, 0],
      },
      PSEUDOCYLINDRICAL: {
        relevant: false,
        required: false,
        defaultValue: [0, 0],
      },
      CONIC: {
        relevant: false,
        required: false,
        defaultValue: [0, 0],
      },
      AZIMUTHAL: {
        relevant: true,
        required: false,
        min: [-180, -90],
        max: [180, 90],
        defaultValue: [0, 0],
      },
    },
  })

  parameterRegistry.register({
    key: 'rotate',
    displayName: 'Rotation (Legacy)',
    description: '[DEPRECATED] Three-axis rotation [lambda, phi, gamma]. Use focusLongitude/focusLatitude instead.',
    type: 'tuple3',
    unit: 'degrees',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: true,
    familyConstraints: {
      CYLINDRICAL: {
        relevant: false,
        required: false,
        defaultValue: [0, 0, 0],
        validate: (value) => {
          if (!Array.isArray(value) || value.length < 2 || value.length > 3) {
            return { isValid: false, error: 'Rotation must be [longitude, latitude] or [longitude, latitude, gamma]' }
          }
          const [lon, lat] = value
          if (lon < -180 || lon > 180) {
            return { isValid: false, error: 'Longitude must be between -180 and 180' }
          }
          if (lat < -90 || lat > 90) {
            return { isValid: false, error: 'Latitude must be between -90 and 90' }
          }
          return { isValid: true }
        },
      },
      PSEUDOCYLINDRICAL: {
        relevant: true,
        required: false,
        min: [-180, -90, -180],
        max: [180, 90, 180],
        defaultValue: [0, 0, 0],
      },
      CONIC: {
        relevant: true,
        required: false,
        min: [-180, -90, -180],
        max: [180, 90, 180],
        defaultValue: [0, 0, 0],
      },
      AZIMUTHAL: {
        relevant: false,
        required: false,
        defaultValue: [0, 0, 0],
      },
    },
  })

  parameterRegistry.register({
    key: 'parallels',
    displayName: 'Standard Parallels',
    description: 'Standard parallels for conic projections [south, north] - only for conic projections',
    type: 'tuple2',
    unit: 'degrees',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: true, // Core parameter for conic projections
    familyConstraints: {
      CYLINDRICAL: {
        relevant: false, // Not used in cylindrical projections
        required: false,
        defaultValue: [30, 60],
      },
      PSEUDOCYLINDRICAL: {
        relevant: false,
        required: false,
        defaultValue: [30, 60],
      },
      CONIC: {
        relevant: true,
        required: false,
        min: [-90, -90],
        max: [90, 90],
        defaultValue: [30, 60],
        validate: (value) => {
          if (!Array.isArray(value) || value.length !== 2) {
            return { isValid: false, error: 'Parallels must be [south, north]' }
          }
          const [south, north] = value
          if (south >= north) {
            return { isValid: false, error: 'South parallel must be less than north parallel' }
          }
          if (south < -90 || south > 90 || north < -90 || north > 90) {
            return { isValid: false, error: 'Parallels must be between -90 and 90 degrees' }
          }
          return { isValid: true }
        },
      },
      AZIMUTHAL: {
        relevant: false,
        required: false,
        defaultValue: [30, 60],
      },
    },
  })

  // Scale parameters

  parameterRegistry.register({
    key: 'scaleMultiplier',
    displayName: 'Scale Multiplier',
    description: 'Scale adjustment factor applied to atlas referenceScale',
    type: 'number',
    unit: 'multiplier',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: true, // Core scale parameter
    familyConstraints: {
      CYLINDRICAL: {
        relevant: true, // Used for user scale adjustments
        required: false,
        min: 0.01,
        max: 10,
        step: 0.1,
        defaultValue: 1.0,
      },
      PSEUDOCYLINDRICAL: {
        relevant: true,
        required: false,
        min: 0.01,
        max: 10,
        step: 0.1,
        defaultValue: 1.0,
      },
      CONIC: {
        relevant: true,
        required: false,
        min: 0.01,
        max: 10,
        step: 0.1,
        defaultValue: 1.0,
      },
      AZIMUTHAL: {
        relevant: true,
        required: false,
        min: 0.01,
        max: 10,
        step: 0.1,
        defaultValue: 1.0,
      },
    },
  })

  // Zoom parameters (unified mode only)

  parameterRegistry.register({
    key: 'zoomLevel',
    displayName: 'Zoom Level',
    description: 'Zoom multiplier applied to auto-fit scale (unified mode only)',
    type: 'number',
    unit: 'multiplier',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: false, // Optional parameter
    familyConstraints: {
      CYLINDRICAL: {
        relevant: true, // Available for unified mode zoom
        required: false,
        min: 0.5,
        max: 10,
        step: 0.1,
        defaultValue: 1.0,
      },
      PSEUDOCYLINDRICAL: {
        relevant: true,
        required: false,
        min: 0.5,
        max: 10,
        step: 0.1,
        defaultValue: 1.0,
      },
      CONIC: {
        relevant: true,
        required: false,
        min: 0.5,
        max: 10,
        step: 0.1,
        defaultValue: 1.0,
      },
      AZIMUTHAL: {
        relevant: true,
        required: false,
        min: 0.5,
        max: 10,
        step: 0.1,
        defaultValue: 1.0,
      },
    },
  })

  // Translation parameters

  parameterRegistry.register({
    key: 'translateOffset',
    displayName: 'Layout Position',
    description: 'Territory position offset from map center [x, y] - stored in layout section of preset',
    type: 'tuple2',
    unit: 'pixels',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: true, // Core layout parameter
    familyConstraints: {
      CYLINDRICAL: {
        relevant: true, // Used for territory positioning in composite projections
        required: false,
        defaultValue: [0, 0],
        validate: (value) => {
          if (!Array.isArray(value) || value.length !== 2) {
            return { isValid: false, error: 'Translate offset must be [x, y]' }
          }
          const [x, y] = value
          if (x < -2000 || x > 2000 || y < -2000 || y > 2000) {
            return { isValid: false, error: 'Translate offset values must be between -2000 and 2000' }
          }
          return { isValid: true }
        },
      },
      PSEUDOCYLINDRICAL: {
        relevant: true,
        required: false,
        defaultValue: [0, 0],
      },
      CONIC: {
        relevant: true,
        required: false,
        defaultValue: [0, 0],
      },
      AZIMUTHAL: {
        relevant: true,
        required: false,
        defaultValue: [0, 0],
      },
    },
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
    familyConstraints: {
      CYLINDRICAL: {
        relevant: false,
        required: false,
        defaultValue: 90,
      },
      PSEUDOCYLINDRICAL: {
        relevant: false,
        required: false,
        defaultValue: 90,
      },
      CONIC: {
        relevant: false,
        required: false,
        defaultValue: 90,
      },
      AZIMUTHAL: {
        relevant: true,
        required: false,
        min: 0,
        max: 180,
        step: 1,
        defaultValue: 90,
      },
    },
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
    familyConstraints: {
      CYLINDRICAL: {
        relevant: true,
        required: false,
        min: 0.01,
        max: 10,
        step: 0.01,
        defaultValue: 0.1,
      },
      PSEUDOCYLINDRICAL: {
        relevant: true,
        required: false,
        min: 0.01,
        max: 10,
        step: 0.01,
        defaultValue: 0.1,
      },
      CONIC: {
        relevant: true,
        required: false,
        min: 0.01,
        max: 10,
        step: 0.01,
        defaultValue: 0.1,
      },
      AZIMUTHAL: {
        relevant: true,
        required: false,
        min: 0.01,
        max: 10,
        step: 0.01,
        defaultValue: 0.1,
      },
    },
  })

  // Pixel-based clip extent parameter
  parameterRegistry.register({
    key: 'pixelClipExtent',
    displayName: 'Pixel Clip Extent',
    description: 'Pixel-based clipping rectangle relative to territory center [x1, y1, x2, y2]',
    type: 'custom',
    unit: 'pixels',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: false,
    familyConstraints: {
      CYLINDRICAL: {
        relevant: true,
        required: false,
        min: [-500, -500, -500, -500],
        max: [500, 500, 500, 500],
        step: 1,
        defaultValue: [-100, -100, 100, 100],
      },
      PSEUDOCYLINDRICAL: {
        relevant: true,
        required: false,
        min: [-500, -500, -500, -500],
        max: [500, 500, 500, 500],
        step: 1,
        defaultValue: [-100, -100, 100, 100],
      },
      CONIC: {
        relevant: true,
        required: false,
        min: [-500, -500, -500, -500],
        max: [500, 500, 500, 500],
        step: 1,
        defaultValue: [-100, -100, 100, 100],
      },
      AZIMUTHAL: {
        relevant: true,
        required: false,
        min: [-500, -500, -500, -500],
        max: [500, 500, 500, 500],
        step: 1,
        defaultValue: [-100, -100, 100, 100],
      },
    },
  })

  // pixelClipExtent is the only clipping format - 4-element array [x1, y1, x2, y2]
  // Coordinates are pixels relative to territory center (translateOffset)

  // Metadata parameters
  parameterRegistry.register({
    key: 'projectionId',
    displayName: 'Projection ID',
    description: 'Projection identifier from registry (e.g., "mercator", "conic-conformal")',
    type: 'custom',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: true, // Essential for reconstruction
    familyConstraints: {
      CYLINDRICAL: {
        relevant: true,
        required: true,
        defaultValue: 'mercator',
      },
      PSEUDOCYLINDRICAL: {
        relevant: true,
        required: true,
        defaultValue: 'natural-earth',
      },
      CONIC: {
        relevant: true,
        required: true,
        defaultValue: 'conic-conformal',
      },
      AZIMUTHAL: {
        relevant: true,
        required: true,
        defaultValue: 'orthographic',
      },
    },
  })
}
