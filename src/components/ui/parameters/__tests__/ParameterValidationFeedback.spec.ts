import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import ParameterValidationFeedback from '../ParameterValidationFeedback.vue'

describe('parameterValidationFeedback', () => {
  const initialLocale = i18n.global.locale.value

  afterEach(() => {
    i18n.global.locale.value = initialLocale
  })

  it('shows each issue in the language of the application', () => {
    i18n.global.locale.value = 'fr'
    const wrapper = mount(ParameterValidationFeedback, {
      props: { issues: [
        { code: 'PARAMETER_TOO_SMALL', parameter: 'scaleMultiplier', min: 0.01 },
        { code: 'PARAMETER_NOT_PAIR', parameter: 'center' },
      ] },
      global: { plugins: [i18n] },
    })

    expect(wrapper.findAll('li').map(item => item.text())).toEqual([
      'Le paramètre scaleMultiplier doit valoir au moins 0.01',
      'Le paramètre center doit avoir 2 nombres',
    ])
  })
})
