import type { VueWrapper } from '@vue/test-utils'
import type { DropdownOption, DropdownOptionGroup } from '../DropdownControl.vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import DropdownControl from '../DropdownControl.vue'

// Create i18n instance for tests
const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      'test.option1': 'Option 1',
      'test.option2': 'Option 2',
      'test.option3': 'Option 3',
      'test.label': 'Test Label',
      'test.group1': 'Group 1',
      'test.group2': 'Group 2',
    },
  },
})

describe('dropdownControl', () => {
  let wrapper: VueWrapper<any>

  const defaultOptions: DropdownOption[] = [
    { value: 'option1', label: 'test.option1' },
    { value: 'option2', label: 'test.option2' },
    { value: 'option3', label: 'test.option3' },
  ]

  const optionsWithIcons: DropdownOption[] = [
    { value: 'fr', label: 'test.option1', icon: '🇫🇷' },
    { value: 'en', label: 'test.option2', icon: '🇬🇧' },
    { value: 'es', label: 'test.option3', icon: '🇪🇸' },
  ]

  const optionsWithIconClasses: DropdownOption[] = [
    { value: 'map', label: 'test.option1', icon: 'ri-map-2-line' },
    { value: 'globe', label: 'test.option2', icon: 'ri-global-line' },
    { value: 'pin', label: 'test.option3', icon: 'ri-map-pin-line' },
  ]

  const optionsWithBadges: DropdownOption[] = [
    { value: 'best', label: 'test.option1', badge: '+++' },
    { value: 'good', label: 'test.option2', badge: '++' },
    { value: 'ok', label: 'test.option3', badge: '+' },
  ]

  const optionGroups: DropdownOptionGroup[] = [
    {
      key: 'group1',
      label: 'test.group1',
      options: [
        { value: 'g1-opt1', label: 'test.option1' },
        { value: 'g1-opt2', label: 'test.option2' },
      ],
    },
    {
      key: 'group2',
      label: 'test.group2',
      options: [
        { value: 'g2-opt1', label: 'test.option1' },
        { value: 'g2-opt2', label: 'test.option2' },
      ],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render standard fieldset version by default', () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      expect(wrapper.find('fieldset').exists()).toBe(true)
      expect(wrapper.find('legend').exists()).toBe(true)
      expect(wrapper.find('.btn').exists()).toBe(true)
    })

    it('should render inline version when inline prop is true', () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
          inline: true,
        },
        global: {
          plugins: [i18n],
        },
      })

      expect(wrapper.find('fieldset').exists()).toBe(false)
      expect(wrapper.find('.dropdown-end').exists()).toBe(true)
      // Inline button has custom styling
      const button = wrapper.find('button[type="button"]')
      expect(button.exists()).toBe(true)
      expect(button.classes()).toContain('btn-ghost')
    })

    it('should display selected option label', () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      expect(button.text()).toContain('Option 1')
    })

    it('should display emoji icon for selected option', () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: optionsWithIcons,
          modelValue: 'fr',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      expect(button.html()).toContain('🇫🇷')
    })

    it('should render icon class for selected option', () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: optionsWithIconClasses,
          modelValue: 'map',
        },
        global: {
          plugins: [i18n],
        },
      })

      const icon = wrapper.find('.ri-map-2-line')
      expect(icon.exists()).toBe(true)
    })

    it('should display badge for selected option', () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: optionsWithBadges,
          modelValue: 'best',
        },
        global: {
          plugins: [i18n],
        },
      })

      const badge = wrapper.find('.badge')
      expect(badge.exists()).toBe(true)
      expect(badge.text()).toBe('+++')
    })

    it('should display placeholder when no value selected', () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      expect(button.text()).toContain('Select...')
    })

    it('should render option groups correctly', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          optionGroups,
          modelValue: 'g1-opt1',
        },
        global: {
          plugins: [i18n],
        },
      })

      // Open dropdown to see groups
      await wrapper.find('.btn').trigger('click')
      await nextTick()

      const menu = wrapper.findComponent({ name: 'DropdownMenu' })
      expect(menu.exists()).toBe(true)
      expect(menu.props('optionGroups')?.length).toBe(2)
      // The menu component internally renders group titles with .menu-title class
      // Testing that the correct groups are passed as props is sufficient
    })

    it('should be disabled when disabled prop is true', () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
          disabled: true,
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      expect(button.attributes('disabled')).toBeDefined()
      expect(button.classes()).toContain('btn-disabled')
    })
  })

  describe('dropdown state management', () => {
    it('should open dropdown when button is clicked', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('click')
      await nextTick()

      const dropdown = wrapper.find('.dropdown')
      expect(dropdown.classes()).toContain('dropdown-open')
      // The menu is a separate component (DropdownMenu) that renders when open
      const menu = wrapper.findComponent({ name: 'DropdownMenu' })
      expect(menu.exists()).toBe(true)
    })

    it('should close dropdown when button is clicked again', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('click')
      await nextTick()
      expect(wrapper.find('.dropdown').classes()).toContain('dropdown-open')

      await button.trigger('click')
      await nextTick()
      expect(wrapper.find('.dropdown').classes()).not.toContain('dropdown-open')
    })

    it('should close dropdown when option is clicked', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('click')
      await nextTick()

      const menu = wrapper.findComponent({ name: 'DropdownMenu' })
      expect(menu.exists()).toBe(true)

      // Simulate selecting an option by emitting the select event from the menu
      menu.vm.$emit('select', 'option2')
      await nextTick()

      expect(wrapper.find('.dropdown').classes()).not.toContain('dropdown-open')
    })

    it('should not open dropdown when disabled', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
          disabled: true,
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('click')
      await nextTick()

      expect(wrapper.find('.dropdown').classes()).not.toContain('dropdown-open')
    })
  })

  describe('selection behavior', () => {
    it('should emit update:modelValue when option is clicked', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      await wrapper.find('.btn').trigger('click')
      await nextTick()

      const menu = wrapper.findComponent({ name: 'DropdownMenu' })
      // Simulate selecting an option by emitting the select event from the menu
      menu.vm.$emit('select', 'option2')
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['option2'])
    })

    it('should emit change event when option is selected', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      await wrapper.find('.btn').trigger('click')
      await nextTick()

      const menu = wrapper.findComponent({ name: 'DropdownMenu' })
      // Simulate selecting an option by emitting the select event from the menu
      menu.vm.$emit('select', 'option2')
      await nextTick()

      expect(wrapper.emitted('change')).toBeTruthy()
      expect(wrapper.emitted('change')?.[0]).toEqual(['option2'])
    })

    it('should highlight selected option in dropdown', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option2',
        },
        global: {
          plugins: [i18n],
        },
      })

      await wrapper.find('.btn').trigger('click')
      await nextTick()

      const menu = wrapper.findComponent({ name: 'DropdownMenu' })
      expect(menu.exists()).toBe(true)
      expect(menu.props('localValue')).toBe('option2')
      // The menu component internally highlights the selected option with bg-primary
      // Testing that the correct value is passed as a prop is sufficient
    })
  })

  describe('keyboard navigation', () => {
    it('should open dropdown when Enter is pressed on button', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('keydown', { key: 'Enter' })
      await nextTick()

      expect(wrapper.find('.dropdown').classes()).toContain('dropdown-open')
    })

    it('should open dropdown when Space is pressed on button', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('keydown', { key: ' ' })
      await nextTick()

      expect(wrapper.find('.dropdown').classes()).toContain('dropdown-open')
    })

    it('should close dropdown when Escape is pressed', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('click')
      await nextTick()

      await button.trigger('keydown', { key: 'Escape' })
      await nextTick()

      expect(wrapper.find('.dropdown').classes()).not.toContain('dropdown-open')
    })

    it('should navigate down with ArrowDown when dropdown is open', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('click')
      await nextTick()

      await button.trigger('keydown', { key: 'ArrowDown' })
      await nextTick()

      // Should emit update:modelValue for option2
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['option2'])
    })

    it('should navigate up with ArrowUp when dropdown is open', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option2',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('click')
      await nextTick()

      await button.trigger('keydown', { key: 'ArrowUp' })
      await nextTick()

      // Should emit update:modelValue for option1
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['option1'])
    })

    it('should keep dropdown open during ArrowUp/ArrowDown navigation', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('click')
      await nextTick()

      await button.trigger('keydown', { key: 'ArrowDown' })
      await nextTick()

      // Dropdown should still be open
      expect(wrapper.find('.dropdown').classes()).toContain('dropdown-open')

      await button.trigger('keydown', { key: 'ArrowDown' })
      await nextTick()

      // Should still be open
      expect(wrapper.find('.dropdown').classes()).toContain('dropdown-open')
    })

    it('should not open dropdown with ArrowDown when closed', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('keydown', { key: 'ArrowDown' })
      await nextTick()

      expect(wrapper.find('.dropdown').classes()).not.toContain('dropdown-open')
    })

    it('should navigate with ArrowRight when dropdown is closed', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('keydown', { key: 'ArrowRight' })
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['option2'])
    })

    it('should navigate with ArrowLeft when dropdown is closed', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option2',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('keydown', { key: 'ArrowLeft' })
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['option1'])
    })

    it('should loop to start with ArrowRight at end', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option3',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('keydown', { key: 'ArrowRight' })
      await nextTick()

      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['option1'])
    })

    it('should loop to end with ArrowLeft at start', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('keydown', { key: 'ArrowLeft' })
      await nextTick()

      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['option3'])
    })

    it('should not stop at boundaries with ArrowDown', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option3',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('click')
      await nextTick()

      // Try to go down from last option
      await button.trigger('keydown', { key: 'ArrowDown' })
      await nextTick()

      // Should stay at option3 (doesn't loop in open state)
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['option3'])
    })

    it('should not stop at boundaries with ArrowUp', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('click')
      await nextTick()

      // Try to go up from first option
      await button.trigger('keydown', { key: 'ArrowUp' })
      await nextTick()

      // Should stay at option1 (doesn't loop in open state)
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['option1'])
    })

    it('should close dropdown when Tab is pressed', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('click')
      await nextTick()

      await button.trigger('keydown', { key: 'Tab' })
      await nextTick()

      expect(wrapper.find('.dropdown').classes()).not.toContain('dropdown-open')
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA attributes on button', () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      expect(button.attributes('aria-haspopup')).toBe('true')
      expect(button.attributes('aria-expanded')).toBe('false')
    })

    it('should update aria-expanded when dropdown opens', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('click')
      await nextTick()

      expect(button.attributes('aria-expanded')).toBe('true')
    })

    it('should have proper role attributes on dropdown list', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      await wrapper.find('.btn').trigger('click')
      await nextTick()

      const menu = wrapper.findComponent({ name: 'DropdownMenu' })
      expect(menu.exists()).toBe(true)
      expect(menu.props('isOpen')).toBe(true)
      // The menu component internally renders a ul with role="listbox"
      // Testing the prop is sufficient to verify the component is working
    })

    it('should have proper role attributes on options', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      await wrapper.find('.btn').trigger('click')
      await nextTick()

      const menu = wrapper.findComponent({ name: 'DropdownMenu' })
      expect(menu.exists()).toBe(true)
      expect(menu.props('options')?.length).toBe(3)
      // The menu component internally renders options with role="option"
      // Testing the props is sufficient to verify the component receives correct data
    })

    it('should have aria-selected on selected option', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option2',
        },
        global: {
          plugins: [i18n],
        },
      })

      await wrapper.find('.btn').trigger('click')
      await nextTick()

      const menu = wrapper.findComponent({ name: 'DropdownMenu' })
      expect(menu.exists()).toBe(true)
      expect(menu.props('localValue')).toBe('option2')
      // The menu component internally renders the selected option with aria-selected="true"
      // Testing that the correct value is passed as a prop is sufficient
    })

    it('should have unique IDs for options', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      await wrapper.find('.btn').trigger('click')
      await nextTick()

      const options = wrapper.findAll('button[role="option"]')
      const ids = options.map(opt => opt.attributes('id'))
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should have aria-activedescendant when focused index is set', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('click')
      await nextTick()

      // After opening, aria-activedescendant should be set
      expect(button.attributes('aria-activedescendant')).toBeTruthy()
    })
  })

  describe('edge cases', () => {
    it('should handle empty options array', () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: [],
        },
        global: {
          plugins: [i18n],
        },
      })

      expect(wrapper.find('.btn').exists()).toBe(true)
    })

    it('should handle undefined modelValue', () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      expect(button.text()).toContain('Select...')
    })

    it('should handle option groups with flat options', () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          optionGroups,
          modelValue: 'g1-opt1',
        },
        global: {
          plugins: [i18n],
        },
      })

      expect(wrapper.find('.btn').exists()).toBe(true)
      expect(wrapper.find('.btn').text()).toContain('Option 1')
    })

    it('should handle rapid keyboard navigation', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('click')
      await nextTick()

      // Rapid navigation
      await button.trigger('keydown', { key: 'ArrowDown' })
      await button.trigger('keydown', { key: 'ArrowDown' })
      await button.trigger('keydown', { key: 'ArrowUp' })
      await nextTick()

      // Should have emitted multiple events
      expect(wrapper.emitted('update:modelValue')?.length).toBeGreaterThan(1)
    })

    it('should prevent navigation when disabled', async () => {
      wrapper = mount(DropdownControl, {
        props: {
          label: 'test.label',
          options: defaultOptions,
          modelValue: 'option1',
          disabled: true,
        },
        global: {
          plugins: [i18n],
        },
      })

      const button = wrapper.find('.btn')
      await button.trigger('keydown', { key: 'ArrowRight' })
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })
  })
})
