import type { ClipExtentProvider } from '@/services/projection/composite-projection'
import type { ClipExtent } from '@/types'
import { useTerritoryStore } from '@/stores/territory'

/**
 * TerritoryStoreClipExtentProvider
 *
 * Implementation of ClipExtentProvider that gets clipExtent values from the territory store
 */
export class TerritoryStoreClipExtentProvider implements ClipExtentProvider {
  private territoryStore = useTerritoryStore()

  getClipExtent(territoryCode: string): ClipExtent | null {
    const clipExtent = this.territoryStore.territoryClipExtents[territoryCode] ?? null
    return clipExtent
  }
}
