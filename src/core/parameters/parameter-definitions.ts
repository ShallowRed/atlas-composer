import type { AxisControlSpec, FamilyConstraint, FamilyConstraints } from '@/core/parameters/parameter-registry'
import type { PositionParameter } from '@/core/positioning'
import type { ParameterIssue } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import { DEFAULT_SCALE_MULTIPLIER } from '@atlas-composer/specification'
import { parameterRegistry } from '@/core/parameters/parameter-registry'
import { usesPositionParameter } from '@/core/positioning'
import { err, ok } from '@/core/types/result'

const POSITIONED_FAMILIES = ['CYLINDRICAL', 'PSEUDOCYLINDRICAL', 'CONIC', 'AZIMUTHAL'] as const
const OTHER_FAMILIES = ['POLYHEDRAL', 'POLYCONIC', 'MISCELLANEOUS'] as const

// The specification bounds neither the position nor the frame of a territory, in pixels of the canvas
const PIXEL_LIMIT = 2000

// Writings cover the decimals of the presets of configs/presets/
const LONGITUDE: AxisControlSpec = { kind: 'longitude', cyclic: true, step: 0.1, format: { maximumFractionDigits: 3 }, symbol: '°', track: { scale: 'linear', min: -180, max: 180, detents: [0], ticks: [-180, 0, 180] } }
const LATITUDE: AxisControlSpec = { kind: 'latitude', step: 0.1, format: { maximumFractionDigits: 3 }, symbol: '°', track: { scale: 'linear', min: -90, max: 90, detents: [0], ticks: [-90, 0, 90] } }
const ROLL: AxisControlSpec = { kind: 'angle', cyclic: true, step: 1, format: { maximumFractionDigits: 2 }, symbol: '°' }
const PARALLEL: AxisControlSpec = { kind: 'latitude', step: 0.1, format: { maximumFractionDigits: 2 }, symbol: '°', track: { band: 'latitude' } }
const CANVAS_OFFSET: AxisControlSpec = { kind: 'canvas-length', step: 1, format: { maximumFractionDigits: 2 }, symbol: 'px' }

// Bounds of a parameter that the controls of these families do not show
function boundsOfOtherFamilies(constraint: Omit<FamilyConstraint, 'relevant' | 'required'>): FamilyConstraints {
  return Object.fromEntries(OTHER_FAMILIES.map(family => [family, { ...constraint, relevant: false, required: false }]))
}

function validateTranslateOffset(value: any): Result<void, ParameterIssue> {
  if (!Array.isArray(value) || value.length !== 2) {
    return err({ code: 'PARAMETER_NOT_PAIR', parameter: 'translateOffset' })
  }
  const [x, y] = value
  if (x < -PIXEL_LIMIT || x > PIXEL_LIMIT || y < -PIXEL_LIMIT || y > PIXEL_LIMIT) {
    return err({ code: 'PARAMETER_OUT_OF_RANGE', parameter: 'translateOffset', min: -PIXEL_LIMIT, max: PIXEL_LIMIT })
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
    controls: [LONGITUDE, LATITUDE],
    familyConstraints: positionConstraints('center', {
      min: [-180, -90],
      max: [180, 90],
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
    controls: [LONGITUDE, LATITUDE, ROLL],
    familyConstraints: {
      ...positionConstraints('rotate', {
        min: [-180, -90, -180],
        max: [180, 90, 180],
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
    controls: [PARALLEL, PARALLEL],
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
    defaultValue: DEFAULT_SCALE_MULTIPLIER,
    controls: [{ kind: 'ratio', step: 0.01, multiplicative: true, format: { maximumSignificantDigits: 3 }, symbol: '×', track: { scale: 'log', min: 0.05, max: 20, detents: [1], ticks: [0.1, 1, 10] } }],
    familyConstraints: {
      CYLINDRICAL: {
        relevant: true, // Used for user scale adjustments
        required: false,
        min: 0,
        max: Number.POSITIVE_INFINITY,
        minExclusive: true,
      },
      PSEUDOCYLINDRICAL: {
        relevant: true,
        required: false,
        min: 0,
        max: Number.POSITIVE_INFINITY,
        minExclusive: true,
      },
      CONIC: {
        relevant: true,
        required: false,
        min: 0,
        max: Number.POSITIVE_INFINITY,
        minExclusive: true,
      },
      AZIMUTHAL: {
        relevant: true,
        required: false,
        min: 0,
        max: Number.POSITIVE_INFINITY,
        minExclusive: true,
      },
      ...boundsOfOtherFamilies({ min: 0, max: Number.POSITIVE_INFINITY, minExclusive: true }),
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
    controls: [CANVAS_OFFSET, CANVAS_OFFSET],
    familyConstraints: {
      ...Object.fromEntries(POSITIONED_FAMILIES.map(family => [family, {
        relevant: true,
        required: false,
        min: [-PIXEL_LIMIT, -PIXEL_LIMIT],
        max: [PIXEL_LIMIT, PIXEL_LIMIT],
        validate: validateTranslateOffset,
      }])),
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
    controls: [{ kind: 'angle', step: 1, format: { maximumFractionDigits: 2 }, symbol: '°', track: { scale: 'linear', min: 0, max: 180, detents: [90], ticks: [0, 90, 180] } }],
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
        minExclusive: true,
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
    controls: [{ kind: 'threshold', step: 0.1, multiplicative: true, format: { maximumSignificantDigits: 2 }, symbol: 'px' }],
    familyConstraints: {
      CYLINDRICAL: {
        relevant: true,
        required: false,
        min: 0,
        max: Number.POSITIVE_INFINITY,
        minExclusive: true,
      },
      PSEUDOCYLINDRICAL: {
        relevant: true,
        required: false,
        min: 0,
        max: Number.POSITIVE_INFINITY,
        minExclusive: true,
      },
      CONIC: {
        relevant: true,
        required: false,
        min: 0,
        max: Number.POSITIVE_INFINITY,
        minExclusive: true,
      },
      AZIMUTHAL: {
        relevant: true,
        required: false,
        min: 0,
        max: Number.POSITIVE_INFINITY,
        minExclusive: true,
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
    controls: [CANVAS_OFFSET, CANVAS_OFFSET, CANVAS_OFFSET, CANVAS_OFFSET],
    familyConstraints: {
      CYLINDRICAL: {
        relevant: true,
        required: false,
        min: [-PIXEL_LIMIT, -PIXEL_LIMIT, -PIXEL_LIMIT, -PIXEL_LIMIT],
        max: [PIXEL_LIMIT, PIXEL_LIMIT, PIXEL_LIMIT, PIXEL_LIMIT],
      },
      PSEUDOCYLINDRICAL: {
        relevant: true,
        required: false,
        min: [-PIXEL_LIMIT, -PIXEL_LIMIT, -PIXEL_LIMIT, -PIXEL_LIMIT],
        max: [PIXEL_LIMIT, PIXEL_LIMIT, PIXEL_LIMIT, PIXEL_LIMIT],
      },
      CONIC: {
        relevant: true,
        required: false,
        min: [-PIXEL_LIMIT, -PIXEL_LIMIT, -PIXEL_LIMIT, -PIXEL_LIMIT],
        max: [PIXEL_LIMIT, PIXEL_LIMIT, PIXEL_LIMIT, PIXEL_LIMIT],
      },
      AZIMUTHAL: {
        relevant: true,
        required: false,
        min: [-PIXEL_LIMIT, -PIXEL_LIMIT, -PIXEL_LIMIT, -PIXEL_LIMIT],
        max: [PIXEL_LIMIT, PIXEL_LIMIT, PIXEL_LIMIT, PIXEL_LIMIT],
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
