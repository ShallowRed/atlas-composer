import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { AtlasId } from '@/types/branded'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startApplication } from '@/__tests__/composite-utils'
import { err, ok } from '@/core/types/result'
import i18n from '@/i18n'
import { useGeoDataStore } from '@/stores/geoData'
import { useUIStore } from '@/stores/ui'
import CompositeExportDialog from '../CompositeExportDialog.vue'

const createObjectURL = vi.fn(() => 'blob:export')
const writeText = vi.fn(async () => undefined)

function open() {
  return mount(CompositeExportDialog, {
    props: { modelValue: true },
    global: { plugins: [i18n], stubs: { teleport: true } },
  })
}

function clickButton(wrapper: ReturnType<typeof open>, key: 'export.downloadFile' | 'export.copyToClipboard') {
  return wrapper.findAll('button').find(button => button.text().includes(i18n.global.t(key)))!.trigger('click')
}

describe('compositeExportDialog', () => {
  beforeEach(async () => {
    await startApplication('france' as AtlasId)
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    createObjectURL.mockClear()
    writeText.mockClear()
  })

  describe.each(['export.downloadFile', 'export.copyToClipboard'] as const)('%s', (button) => {
    it('shows an error and writes nothing when the export is not available', async () => {
      vi.spyOn(useGeoDataStore(), 'exportConfiguration').mockReturnValue(err({ code: 'EXPORT_NOT_AVAILABLE' }))
      const wrapper = open()

      await clickButton(wrapper, button)
      await flushPromises()

      expect(createObjectURL).not.toHaveBeenCalled()
      expect(writeText).not.toHaveBeenCalled()
      expect(useUIStore().toasts).toHaveLength(1)
      expect(useUIStore().toasts[0]).toMatchObject({ type: 'error', error: { code: 'EXPORT_NOT_AVAILABLE' } })
    })

    it('reports a success when the export is available', async () => {
      vi.spyOn(useGeoDataStore(), 'exportConfiguration').mockReturnValue(ok({ version: '1.1' } as CompositeProjectionConfig))
      const wrapper = open()

      await clickButton(wrapper, button)
      await flushPromises()

      expect(createObjectURL.mock.calls.length + writeText.mock.calls.length).toBe(1)
      expect(useUIStore().toasts[0]).toMatchObject({ type: 'success' })
    })
  })
})
