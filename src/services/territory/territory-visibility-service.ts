export class TerritoryVisibilityService {
  static shouldShowEmptyState(territoryCount: number): boolean {
    return territoryCount === 0
  }

  static hasTerritoryInList(
    territoryCodes: string[],
    targetCode: string,
  ): boolean {
    return territoryCodes.includes(targetCode)
  }
}
