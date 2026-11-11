import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { useAtlasList } from '@/composables/useAtlasList'
import i18n from '@/i18n'

function readAtlasList() {
  let result: ReturnType<typeof useAtlasList>['atlasList']['value'] = []
  mount(defineComponent({
    setup() {
      result = useAtlasList().atlasList.value
      return () => h('div')
    },
  }), { global: { plugins: [i18n] } })
  return result.flatMap(group => group.options)
}

describe('useAtlasList', () => {
  afterEach(() => {
    i18n.global.locale.value = 'en'
  })

  it('lists the view modes for which an atlas has presets', () => {
    const atlases = readAtlasList()

    expect(atlases.find(atlas => atlas.value === 'world')?.views.map(view => view.mode)).toEqual(['unified'])
    expect(atlases.find(atlas => atlas.value === 'france')?.views.map(view => view.mode))
      .toEqual(['composite-custom', 'split', 'built-in-composite', 'unified'])
  })

  it('names the presets of a view mode in the current locale', () => {
    i18n.global.locale.value = 'fr'

    const france = readAtlasList().find(atlas => atlas.value === 'france')
    const customComposite = france?.views.find(view => view.mode === 'composite-custom')

    expect(customComposite?.label).toBe('Projection composite personnalisée')
    expect(customComposite?.presets.map(preset => preset.name)).toContain('Composite personnalisée par défaut')
  })
})
