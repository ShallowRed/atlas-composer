import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { ImportError } from '@/core/types/errors'
import type { AtlasId } from '@/types/branded'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startApplication } from '@/__tests__/composite-utils'
import { err, ok } from '@/core/types/result'
import i18n from '@/i18n'
import { useCompositionStore } from '@/stores/composition'
import ImportModal from '../ImportModal.vue'

const CONFIG = { metadata: { atlasName: 'France' }, territories: [] } as unknown as CompositeProjectionConfig
const MISMATCH: ImportError = { code: 'IMPORT_ATLAS_MISMATCH', importedAtlasId: 'portugal', currentAtlasId: 'france' }
const SUCCESS_TEXT = 'Configuration is valid and ready to import'

async function openWithFile() {
  const wrapper = mount(ImportModal, {
    props: { modelValue: true, compositeProjection: {} },
    global: { plugins: [i18n], stubs: { teleport: true } },
  })
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [new File(['{}'], 'config.json')] })
  await input.trigger('change')
  await flushPromises()
  return wrapper
}

function applyButton(wrapper: Awaited<ReturnType<typeof openWithFile>>) {
  return wrapper.findAll('button').find(button => button.text().includes('Apply Configuration'))!
}

describe('importModal', () => {
  const initialLocale = i18n.global.locale.value

  beforeEach(async () => {
    await startApplication('france' as AtlasId)
    i18n.global.locale.value = 'en'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    i18n.global.locale.value = initialLocale
  })

  it('shows the error of a refused file and keeps the button inactive', async () => {
    vi.spyOn(useCompositionStore(), 'readConfigurationFile').mockResolvedValue(err(MISMATCH))

    const wrapper = await openWithFile()

    expect(wrapper.text()).toContain('This configuration is for atlas portugal')
    expect(wrapper.text()).not.toContain(SUCCESS_TEXT)
    expect(applyButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('lists each rule of an invalid file', async () => {
    vi.spyOn(useCompositionStore(), 'readConfigurationFile').mockResolvedValue(err({
      code: 'IMPORT_INVALID',
      issues: [{ code: 'PRESET_SCHEMA_MISSING_FIELD', path: 'version' }, { code: 'PRESET_SCHEMA_MISSING_FIELD', path: 'metadata' }],
    }))

    const wrapper = await openWithFile()

    expect(wrapper.findAll('li').map(item => item.text())).toEqual(['version is missing', 'metadata is missing'])
  })

  it('activates the button for an accepted file', async () => {
    vi.spyOn(useCompositionStore(), 'readConfigurationFile').mockResolvedValue(ok(CONFIG))

    const wrapper = await openWithFile()

    expect(wrapper.text()).toContain(SUCCESS_TEXT)
    expect(applyButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('shows the error of a failed application and disables the button', async () => {
    const compositionStore = useCompositionStore()
    vi.spyOn(compositionStore, 'readConfigurationFile').mockResolvedValue(ok(CONFIG))
    vi.spyOn(compositionStore, 'importConfiguration').mockResolvedValue(err({ code: 'IMPORT_APPLICATION_FAILED', reason: 'reason-x' }))

    const wrapper = await openWithFile()
    await applyButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('reason-x')
    expect(wrapper.text()).not.toContain(SUCCESS_TEXT)
    expect(applyButton(wrapper).attributes('disabled')).toBeDefined()
  })
})
