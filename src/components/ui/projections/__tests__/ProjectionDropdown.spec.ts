import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ProjectionDropdown from '@/components/ui/projections/ProjectionDropdown.vue'
import { ProjectionCategory } from '@/core/projections/types'
import i18n from '@/i18n'
import { createProjectionId } from '@/types/branded'
import { getCategoryIcon } from '@/utils/projection-icons'

describe('projectionDropdown', () => {
  it('gives the menu the translated name and the icon of each category, and the translated name of each projection', async () => {
    i18n.global.locale.value = 'en'
    const wrapper = mount(ProjectionDropdown, {
      props: {
        label: 'Projection',
        modelValue: createProjectionId('conic-conformal'),
        projectionGroups: [{ category: ProjectionCategory.CONIC, options: [{ value: 'conic-conformal', label: 'projections.conicConformal.name' }] }],
      },
      global: { plugins: [i18n] },
    })

    await wrapper.find('button[aria-haspopup]').trigger('click')

    const title = wrapper.find('.menu-title')
    expect(title.text()).toBe(i18n.global.t('projections.categories.CONIC'))
    expect(title.find('i').classes()).toContain(getCategoryIcon(ProjectionCategory.CONIC))
    expect(wrapper.find('[role="option"]').text()).toContain(i18n.global.t('projections.conicConformal.name'))
  })
})
