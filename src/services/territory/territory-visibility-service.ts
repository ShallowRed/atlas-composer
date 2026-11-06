export class TerritoryVisibilityService {
  static shouldShowEmptyState(territoryCount: number): boolean {
    return territoryCount === 0
  }
}
