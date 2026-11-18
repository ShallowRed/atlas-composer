import type { AxisControl } from '@/core/parameters/parameter-registry'

// Domains from canvasDimensions of definitions.schema.json and referenceScale of composite-projection.schema.json
export const CANVAS_LENGTH_CONTROL: AxisControl = {
  kind: 'canvas-length',
  domain: { min: 1, max: Number.POSITIVE_INFINITY },
  step: 1,
  format: { maximumFractionDigits: 0 },
  symbol: 'px',
}

export const REFERENCE_SCALE_CONTROL: AxisControl = {
  kind: 'scale',
  domain: { min: 1, max: Number.POSITIVE_INFINITY },
  step: 0.01,
  multiplicative: true,
  format: { maximumSignificantDigits: 4 },
  track: { scale: 'log', min: 100, max: 20000, detents: [], ticks: [100, 1000, 10000] },
  symbol: '',
}
