import type { AtlasId, PresetId } from '@/types/branded'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { startApplication } from '@/__tests__/composite-utils'
import { ok } from '@/core/types/result'
import { useAtlasStore } from '@/stores/atlas'
import { useCompositionStore } from '@/stores/composition'
import DropdownControl from '../../forms/DropdownControl.vue'
import PresetSelector from '../PresetSelector.vue'

vi.mock('vue-i18n', async importOriginal => ({
  ...await importOriginal<typeof import('vue-i18n')>(),
  useI18n: () => ({ t: (key: string) => key, locale: { value: 'en' } }),
}))

const FRANCE = 'france' as AtlasId
const PRESET = 'france-proportional' as PresetId

async function selectPreset() {
  const wrapper = mount(PresetSelector)
  const dropdown = wrapper.findComponent(DropdownControl)
  dropdown.vm.$emit('update:modelValue', PRESET)
  await flushPromises()
  return dropdown
}

describe('presetSelector', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the preset that the store loaded', async () => {
    await startApplication(FRANCE)
    vi.spyOn(useCompositionStore(), 'loadPreset').mockResolvedValue(ok(undefined))

    const dropdown = await selectPreset()

    expect(dropdown.props('modelValue')).toBe(PRESET)
  })

  it('leaves a preset that the store dropped after a change of atlas', async () => {
    await startApplication(FRANCE)
    vi.spyOn(useCompositionStore(), 'loadPreset').mockImplementation(async () => {
      useAtlasStore().selectedAtlasId = 'usa' as AtlasId
      return ok(undefined)
    })

    const dropdown = await selectPreset()

    expect(dropdown.props('modelValue')).not.toBe(PRESET)
  })
})
