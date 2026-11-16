import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppHeader from '@/components/ui/layout/AppHeader.vue'
import i18n from '@/i18n'
import router from '@/router'

describe('appHeader', () => {
  it('links to each page that the routes put in the navigation, the current page without a link', async () => {
    i18n.global.locale.value = 'en'
    await router.push('/about')
    const wrapper = mount(AppHeader, {
      global: {
        plugins: [i18n, router],
        stubs: { LanguageSelector: true, ThemeSelector: true },
      },
    })

    const links = wrapper.findAll('nav a[href^="/"]').map(link => [link.attributes('href'), link.text()])
    expect(links).toEqual([['/', 'App'], ['/atlas', 'Atlases'], ['/examples', 'Examples']])
    expect(wrapper.find('nav span.text-primary').text()).toBe('About')
  })
})
