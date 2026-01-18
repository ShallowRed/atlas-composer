import type { TerritoryConfig } from '@/types'

export function createTerritoryMap(territories: TerritoryConfig[]): Map<string, TerritoryConfig> {
  return new Map(territories.map(t => [t.code, t]))
}

export function getTerritoryConfig(
  territories: Map<string, TerritoryConfig>,
  code: string,
): TerritoryConfig | undefined {
  return territories.get(code)
}

export function getTerritoryName(
  territories: Map<string, TerritoryConfig>,
  code: string,
): string {
  return territories.get(code)?.name || code
}

export function getTerritoryShortName(
  territories: Map<string, TerritoryConfig>,
  code: string,
): string {
  const config = territories.get(code)
  return config?.shortName || config?.name || code
}

export function extractTerritoryCodes(territories: TerritoryConfig[]): string[] {
  return territories.map(t => t.code)
}

export function getTerritoryByCode(
  territories: TerritoryConfig[],
  code: string,
): TerritoryConfig | undefined {
  return territories.find(t => t.code === code)
}

export function getTerritoryNameFromArray(
  territories: TerritoryConfig[],
  code: string,
): string {
  const territory = territories.find(t => t.code === code)
  return territory?.name || code
}

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
