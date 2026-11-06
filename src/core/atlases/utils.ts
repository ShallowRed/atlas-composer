import type { TerritoryConfig } from '@/types'

export function getTerritoriesForMode(
  territories: TerritoryConfig[],
  mode: string,
  modeConfig: Record<string, any>,
): TerritoryConfig[] {
  const modeDefinition = modeConfig[mode]
  if (!modeDefinition) {
    return []
  }

  if (modeDefinition.codes.length === 0) {
    return []
  }

  let codes = modeDefinition.codes
  if (codes.includes('*')) {
    codes = territories.map(t => t.code)

    if (modeDefinition.exclude && Array.isArray(modeDefinition.exclude)) {
      codes = codes.filter((code: string) => !modeDefinition.exclude.includes(code))
    }
  }

  const codesSet = new Set(codes)
  return territories.filter(t => codesSet.has(t.code))
}
