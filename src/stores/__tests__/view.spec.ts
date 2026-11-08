import type { AtlasId } from '@/types/branded'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openView, startApplication } from '@/__tests__/composite-utils'
import { err } from '@/core/types/result'
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

      expect(await viewStore.loadViewPreset(createPresetId('france-split'))).toEqual(err({
        code: 'PRESET_NOT_APPLICABLE',
        presetId: 'france-split',
        presetType: 'split',
        viewMode: 'unified',
      }))

      expect(viewStore.currentViewPreset).toBe(currentPreset)
    })

    it('refuses a composite preset', async () => {
      await startApplication(FRANCE)
      const viewStore = useViewStore()
      const currentPreset = viewStore.currentViewPreset

      expect(await viewStore.loadViewPreset(createPresetId('france-standard'))).toEqual(err({
        code: 'PRESET_NOT_APPLICABLE',
        presetId: 'france-standard',
        presetType: 'composite-custom',
        viewMode: 'composite-custom',
      }))

      expect(viewStore.currentViewPreset).toBe(currentPreset)
    })

    it('fails when the file of the preset does not load', async () => {
      await startApplication(FRANCE)
      await openView(FRANCE, 'unified')
      const viewStore = useViewStore()
      const currentPreset = viewStore.currentViewPreset
      vi.stubGlobal('fetch', async () => new Response('', { status: 404 }))

      expect(await viewStore.loadViewPreset(createPresetId('france-unified'))).toMatchObject({
        ok: false,
        error: { code: 'JSON_FILE_NOT_FOUND' },
      })

      expect(viewStore.currentViewPreset).toBe(currentPreset)
    })
  })
})
