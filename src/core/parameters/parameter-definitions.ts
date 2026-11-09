import type { FamilyConstraint, FamilyConstraints } from '@/core/parameters/parameter-registry'
import type { PositionParameter } from '@/core/positioning'
import type { ParameterIssue } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import { parameterRegistry } from '@/core/parameters/parameter-registry'
import { usesPositionParameter } from '@/core/positioning'
import { err, ok } from '@/core/types/result'

const POSITIONED_FAMILIES = ['CYLINDRICAL', 'PSEUDOCYLINDRICAL', 'CONIC', 'AZIMUTHAL'] as const
const OTHER_FAMILIES = ['POLYHEDRAL', 'POLYCONIC', 'MISCELLANEOUS'] as const

const TRANSLATE_OFFSET_LIMIT = 2000

// Bounds of a parameter that the controls of these families do not show
function boundsOfOtherFamilies(constraint: Omit<FamilyConstraint, 'relevant' | 'required'>): FamilyConstraints {
  return Object.fromEntries(OTHER_FAMILIES.map(family => [family, { ...constraint, relevant: false, required: false }]))
}

function validateTranslateOffset(value: any): Result<void, ParameterIssue> {
  if (!Array.isArray(value) || value.length !== 2) {
    return err({ code: 'PARAMETER_NOT_PAIR', parameter: 'translateOffset' })
  }
  const [x, y] = value
  if (x < -TRANSLATE_OFFSET_LIMIT || x > TRANSLATE_OFFSET_LIMIT || y < -TRANSLATE_OFFSET_LIMIT || y > TRANSLATE_OFFSET_LIMIT) {
    return err({ code: 'PARAMETER_OUT_OF_RANGE', parameter: 'translateOffset', min: -TRANSLATE_OFFSET_LIMIT, max: TRANSLATE_OFFSET_LIMIT })
  }
  return ok(undefined)
}

function positionConstraints(
  parameter: PositionParameter,
  constraint: Omit<FamilyConstraint, 'relevant' | 'required'>,
): FamilyConstraints {
  return Object.fromEntries(POSITIONED_FAMILIES.map(family => [family, {
    ...constraint,
    relevant: usesPositionParameter(family, parameter),
    required: false,
  }]))
}

export function registerAllParameters(): void {
  parameterRegistry.register({
    key: 'center',
    displayName: 'Center',
    description: 'd3 center [longitude, latitude]: the point placed at the translate point of the projection.',
    type: 'tuple2',
    unit: 'degrees',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: true,
    defaultValue: [0, 0],
    familyConstraints: positionConstraints('center', {
      min: [-180, -90],
      max: [180, 90],
      step: 0.5,
    }),
  })

  parameterRegistry.register({
    key: 'rotate',
    displayName: 'Rotation',
    description: 'd3 rotation [lambda, phi, gamma] of the sphere before projection.',
    type: 'tuple3',
    unit: 'degrees',
    source: 'preset',
    mutable: true,
    exportable: true,
    requiresPreset: true,
    defaultValue: [0, 0, 0],
    familyConstraints: {
      ...positionConstraints('rotate', {
        min: [-180, -90, -180],
        max: [180, 90, 180],
        step: 0.5,
      }),
      ...boundsOfOtherFamilies({ min: [-180, -90, -180], max: [180, 90, 180] }),
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
    defaultValue: [30, 60],
    familyConstraints: {
      CYLINDRICAL: {
        relevant: false, // Not used in cylindrical projections
        required: false,
      },
      PSEUDOCYLINDRICAL: {
        relevant: false,
        required: false,
      },
      CONIC: {
        relevant: true,
        required: false,
        min: [-90, -90],
        max: [90, 90],
        step: 1,
        validate: (value) => {
          if (!Array.isArray(value) || value.length !== 2) {
            return err({ code: 'PARAMETER_NOT_PAIR', parameter: 'parallels' })
          }
          const [south, north] = value
          if (south >= north) {
            return err({ code: 'PARAMETER_PARALLELS_ORDER', parameter: 'parallels' })
          }
          if (south < -90 || south > 90 || north < -90 || north > 90) {
            return err({ code: 'PARAMETER_OUT_OF_RANGE', parameter: 'parallels', min: -90, max: 90 })
          }
          return ok(undefined)
        },
      },
      AZIMUTHAL: {
        relevant: false,
        required: false,
      },
    },
  })

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
    defaultValue: 1,
    familyConstraints: {
      CYLINDRICAL: {
        relevant: true, // Used for user scale adjustments
        required: false,
        min: 0.01,
        max: 10,
        step: 0.01,
      },
      PSEUDOCYLINDRICAL: {
        relevant: true,
        required: false,
        min: 0.01,
        max: 10,
        step: 0.01,
      },
      CONIC: {
        relevant: true,
        required: false,
        min: 0.01,
        max: 10,
        step: 0.01,
      },
      AZIMUTHAL: {
        relevant: true,
        required: false,
        min: 0.01,
        max: 10,
        step: 0.01,
      },
      ...boundsOfOtherFamilies({ min: 0.01, max: 10, step: 0.01 }),
    },
  })

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
    defaultValue: 1,
    familyConstraints: {
      CYLINDRICAL: {
        relevant: true, // Available for unified mode zoom
        required: false,
        min: 0.5,
        max: 10,
        step: 0.1,
      },
      PSEUDOCYLINDRICAL: {
        relevant: true,
        required: false,
        min: 0.5,
        max: 10,
        step: 0.1,
      },
      CONIC: {
        relevant: true,
        required: false,
        min: 0.5,
        max: 10,
        step: 0.1,
      },
      AZIMUTHAL: {
        relevant: true,
        required: false,
        min: 0.5,
        max: 10,
        step: 0.1,
      },
    },
  })

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
    defaultValue: [0, 0],
    familyConstraints: {
      CYLINDRICAL: {
        relevant: true, // Used for territory positioning in composite projections
        required: false,
        min: [-TRANSLATE_OFFSET_LIMIT, -TRANSLATE_OFFSET_LIMIT],
        max: [TRANSLATE_OFFSET_LIMIT, TRANSLATE_OFFSET_LIMIT],
        step: 5,
        validate: validateTranslateOffset,
      },
      PSEUDOCYLINDRICAL: {
        relevant: true,
        required: false,
        min: [-TRANSLATE_OFFSET_LIMIT, -TRANSLATE_OFFSET_LIMIT],
        max: [TRANSLATE_OFFSET_LIMIT, TRANSLATE_OFFSET_LIMIT],
        step: 5,
        validate: validateTranslateOffset,
      },
      CONIC: {
        relevant: true,
        required: false,
        min: [-TRANSLATE_OFFSET_LIMIT, -TRANSLATE_OFFSET_LIMIT],
        max: [TRANSLATE_OFFSET_LIMIT, TRANSLATE_OFFSET_LIMIT],
        step: 5,
        validate: validateTranslateOffset,
      },
      AZIMUTHAL: {
        relevant: true,
        required: false,
        min: [-TRANSLATE_OFFSET_LIMIT, -TRANSLATE_OFFSET_LIMIT],
        max: [TRANSLATE_OFFSET_LIMIT, TRANSLATE_OFFSET_LIMIT],
        step: 5,
        validate: validateTranslateOffset,
      },
      ...boundsOfOtherFamilies({ validate: validateTranslateOffset }),
    },
  })

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
    defaultValue: 90,
    familyConstraints: {
      CYLINDRICAL: {
        relevant: false,
        required: false,
      },
      PSEUDOCYLINDRICAL: {
        relevant: false,
        required: false,
      },
      CONIC: {
        relevant: false,
        required: false,
      },
      AZIMUTHAL: {
        relevant: true,
        required: false,
        min: 0,
        max: 180,
        step: 1,
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
    defaultValue: 0.1,
    familyConstraints: {
      CYLINDRICAL: {
        relevant: true,
        required: false,
        min: 0.01,
        max: 10,
        step: 0.01,
      },
      PSEUDOCYLINDRICAL: {
        relevant: true,
        required: false,
        min: 0.01,
        max: 10,
        step: 0.01,
      },
      CONIC: {
        relevant: true,
        required: false,
        min: 0.01,
        max: 10,
        step: 0.01,
      },
      AZIMUTHAL: {
        relevant: true,
        required: false,
        min: 0.01,
        max: 10,
        step: 0.01,
      },
    },
  })

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
    defaultValue: [-100, -100, 100, 100],
    familyConstraints: {
      CYLINDRICAL: {
        relevant: true,
        required: false,
        min: [-500, -500, -500, -500],
        max: [500, 500, 500, 500],
        step: 10,
      },
      PSEUDOCYLINDRICAL: {
        relevant: true,
        required: false,
        min: [-500, -500, -500, -500],
        max: [500, 500, 500, 500],
        step: 10,
      },
      CONIC: {
        relevant: true,
        required: false,
        min: [-500, -500, -500, -500],
        max: [500, 500, 500, 500],
        step: 10,
      },
      AZIMUTHAL: {
        relevant: true,
        required: false,
        min: [-500, -500, -500, -500],
        max: [500, 500, 500, 500],
        step: 10,
      },
    },
  })

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
      },
      PSEUDOCYLINDRICAL: {
        relevant: true,
        required: true,
      },
      CONIC: {
        relevant: true,
        required: true,
      },
      AZIMUTHAL: {
        relevant: true,
        required: true,
      },
    },
  })
}
