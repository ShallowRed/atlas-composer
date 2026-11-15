export const NO_DATA_COLOR = '#e8e6e3'

interface LegendEntry {
  color: string
  from?: number
  to?: number
}

export function colorOf(value: number | null, thresholds: readonly number[], colors: readonly string[]): string {
  if (value === null) {
    return NO_DATA_COLOR
  }
  const index = thresholds.findIndex(threshold => value < threshold)
  return colors[index === -1 ? thresholds.length : index]!
}

// The first entry has no lower bound and the last no upper bound
export function legendEntries(thresholds: readonly number[], colors: readonly string[]): LegendEntry[] {
  return colors.map((color, index) => ({
    color,
    ...(index > 0 && { from: thresholds[index - 1] }),
    ...(index < thresholds.length && { to: thresholds[index] }),
  }))
}
