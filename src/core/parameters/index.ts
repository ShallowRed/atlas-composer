import { registerAllParameters } from './parameter-definitions'
import { parameterRegistry } from './parameter-registry'

registerAllParameters()

export { CANVAS_LENGTH_CONTROL, REFERENCE_SCALE_CONTROL } from './composition-controls'
export { areParametersEqual } from './parameter-equality'
export { boundDomain, ceilToFormat, floorToFormat, formatValue, isOutsideTrack, orderedPairLimits, parallelsForBand, parseValue, roundToFormat, roundToStep, stepFactor, stepValue, toDomain, trackScale, valueAtTrackPosition } from './parameter-input'
export type { LatitudeBand } from './parameter-input'
export type { AxisControl } from './parameter-registry'
export { parameterRegistry }
