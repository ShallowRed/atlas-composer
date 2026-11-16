import type { CompositionDemoSource } from '@/stores/examples'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { withSetup } from '@/__tests__/test-utils'
import { useCompositionDemo } from '@/composables/useCompositionDemo'
import { ok } from '@/core/types/result'
import { useExamplesStore } from '@/stores/examples'
import { createPresetId } from '@/types/branded'

// A source told apart by the name of its territory
function sourceNamed(name: string) {
  return ok({ input: {}, territoryNames: new Map([['T', name]]) } as unknown as CompositionDemoSource)
}

describe('useCompositionDemo', () => {
  it('keeps the source of the latest preset when an earlier one answers last', async () => {
    setActivePinia(createPinia())
    const store = useExamplesStore()
    vi.spyOn(store, 'loadEarthquakes').mockResolvedValue([])
    const answers = new Map<string, (source: ReturnType<typeof sourceNamed>) => void>()
    vi.spyOn(store, 'loadCompositionDemo').mockImplementation(id => new Promise((resolve) => {
      answers.set(id, resolve)
    }))

    const presetId = ref(createPresetId('france-standard'))
    const { territoryNames, isLoading } = withSetup(() => useCompositionDemo(presetId))
    presetId.value = createPresetId('japan-standard')
    await flushPromises()

    answers.get('japan-standard')!(sourceNamed('japan'))
    await flushPromises()
    answers.get('france-standard')!(sourceNamed('france'))
    await flushPromises()

    expect(territoryNames.value.get('T')).toBe('japan')
    expect(isLoading.value).toBe(false)
  })
})
