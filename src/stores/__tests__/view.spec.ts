import type { AtlasId } from '@/types/branded'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openView, startApplication } from '@/__tests__/composite-utils'
import { resolveI18nValue } from '@/core/atlases/i18n-utils'
import { getAtlasConfig } from '@/core/atlases/registry'
import { err, ok } from '@/core/types/result'
import i18n from '@/i18n'
import { useAtlasStore } from '@/stores/atlas'
import { useViewStore } from '@/stores/view'
import { createPresetId } from '@/types/branded'

const FRANCE = 'france' as AtlasId
const WORLD = 'world' as AtlasId

describe('view store', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('projectionRecommendations', () => {
    it('marks the projections that the atlas recommends', async () => {
      await startApplication(WORLD)
      useAtlasStore().currentAtlasConfig = getAtlasConfig(WORLD)
      useViewStore().viewMode = 'unified'

      const levels = Object.fromEntries(useViewStore().projectionRecommendations.map(({ projection, level }) => [projection.id, level]))

      expect(levels.robinson).toBe('excellent')
      expect(levels.mercator).not.toBe('excellent')
    })
  })

  describe('loadViewPreset', () => {
    it('refuses a preset of another view mode', async () => {
      await startApplication(FRANCE)
      await openView('unified')
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

    it('drops a preset that arrives after a change of atlas', async () => {
      await startApplication(FRANCE)
      await openView('unified')
      const viewStore = useViewStore()
      viewStore.clearViewPreset()

      const loading = viewStore.loadViewPreset(createPresetId('france-unified'))
      useAtlasStore().selectedAtlasId = WORLD

      expect(await loading).toEqual(ok(undefined))
      expect(viewStore.currentViewPreset).toBeNull()
    })

    it('fails when the file of the preset does not load', async () => {
      await startApplication(FRANCE)
      await openView('unified')
      const viewStore = useViewStore()
      viewStore.clearViewPreset()
      vi.stubGlobal('fetch', async () => new Response('', { status: 404 }))

      expect(await viewStore.loadViewPreset(createPresetId('france-unified'))).toMatchObject({
        ok: false,
        error: { code: 'JSON_FILE_NOT_FOUND' },
      })

      expect(viewStore.currentViewPreset).toBeNull()
    })
  })

  describe('availableViewPresets', () => {
    afterEach(() => {
      i18n.global.locale.value = 'en'
    })

    it('gives the name and the description of a preset in the locale chosen after the loading', async () => {
      i18n.global.locale.value = 'en'
      await startApplication(FRANCE)
      await openView('unified')
      const preset = useViewStore().availableViewPresets.find(({ id }) => id === 'france-unified')!

      i18n.global.locale.value = 'fr'

      expect(resolveI18nValue(preset.name, i18n.global.locale.value)).toBe('Vue unifiée')
      expect(resolveI18nValue(preset.description!, i18n.global.locale.value)).toBe('Projection Natural Earth centrée sur la France')
    })
  })
})
