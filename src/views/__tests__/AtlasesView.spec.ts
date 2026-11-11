import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import i18n from '@/i18n'
import AtlasesView from '@/views/AtlasesView.vue'

async function openAtlasesPage(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: defineComponent({ render: () => null }) },
      { path: '/atlas', component: AtlasesView },
    ],
  })
  await router.push(path)
  const wrapper = mount(AtlasesView, { global: { plugins: [i18n, router] } })
  return wrapper.find('section h2').text()
}

describe('atlasesView', () => {
  it('shows the atlas named in the address', async () => {
    expect(await openAtlasesPage('/atlas?atlas=spain')).toBe('Spain')
  })

  it('shows the default atlas of the registry for an address without atlas or with an unknown one', async () => {
    expect(await openAtlasesPage('/atlas')).toBe('France')
    expect(await openAtlasesPage('/atlas?atlas=atlantis')).toBe('France')
  })
})
