import type { AtlasId } from '@/types/branded'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openView, startApplication } from '@/__tests__/composite-utils'
import { useViewStore } from '@/stores/view'
import { createPresetId } from '@/types/branded'

const FRANCE = 'france' as AtlasId

describe('view store', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('loadViewPreset', () => {
    it('refuses a preset of another view mode', async () => {
      await startApplication(FRANCE)
      await openView(FRANCE, 'unified')
      const viewStore = useViewStore()
      const currentPreset = viewStore.currentViewPreset

      await expect(viewStore.loadViewPreset(createPresetId('france-split'))).rejects.toThrow()

      expect(viewStore.currentViewPreset).toBe(currentPreset)
    })

    it('refuses a composite preset', async () => {
      await startApplication(FRANCE)
      const viewStore = useViewStore()
      const currentPreset = viewStore.currentViewPreset

      await expect(viewStore.loadViewPreset(createPresetId('france-standard'))).rejects.toThrow()

      expect(viewStore.currentViewPreset).toBe(currentPreset)
    })

    it('fails when the file of the preset does not load', async () => {
      await startApplication(FRANCE)
      await openView(FRANCE, 'unified')
      const viewStore = useViewStore()
      const currentPreset = viewStore.currentViewPreset
      vi.stubGlobal('fetch', async () => new Response('', { status: 404 }))

      await expect(viewStore.loadViewPreset(createPresetId('france-unified'))).rejects.toThrow()

      expect(viewStore.currentViewPreset).toBe(currentPreset)
    })
  })
})
