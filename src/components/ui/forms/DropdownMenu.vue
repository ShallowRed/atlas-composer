<script setup lang="ts">
import type { DropdownOption, DropdownOptionGroup } from './DropdownControl.vue'
import type { ProjectionCategoryType } from '@/core/projections/types'

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { getCategoryIcon } from '@/utils/projection-icons'

import DropdownOptionItem from './DropdownOptionItem.vue'

interface Props {
  options?: DropdownOption[]
  optionGroups?: DropdownOptionGroup[]
  isOpen: boolean
  localValue?: string | null
  ariaLabelledby?: string
  ariaLabel?: string
  inline?: boolean
  focusedIndex: number
  buttonRef?: HTMLElement | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [value: string]
  keydown: [event: KeyboardEvent, value: string]
}>()

const { t } = useI18n()

const menuPosition = ref({ top: 0, left: 0, width: 0 })

// Translate category to label
function getCategoryLabel(group: DropdownOptionGroup): string {
  // If label is provided, use it directly
  if (group.label) {
    return group.label
  }

  // If category is provided, translate it
  if (group.category) {
    const translationKey = `projections.categories.${group.category}`
    return t(translationKey)
  }

  return ''
}

// Get icon class for category
function getCategoryIconClass(group: DropdownOptionGroup): string | undefined {
  // Only add icon if category is provided (projection categories)
  if (group.category) {
    return getCategoryIcon(group.category as ProjectionCategoryType)
  }
  return undefined
}

function getOptionId(index: number): string {
  return `dropdown-option-${index}`
}

function updateMenuPosition() {
  if (!props.buttonRef || !props.isOpen)
    return

  const buttonRect = props.buttonRef.getBoundingClientRect()
  menuPosition.value = {
    top: buttonRect.bottom + 8, // 8px gap (mt-2)
    left: buttonRect.left,
    width: buttonRect.width,
  }
}

// Watch for open state changes to update position
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    updateMenuPosition()
  }
})

// Update position on scroll or resize
onMounted(() => {
  if (!props.inline) {
    window.addEventListener('scroll', updateMenuPosition, true)
    window.addEventListener('resize', updateMenuPosition)
  }
})

onUnmounted(() => {
  if (!props.inline) {
    window.removeEventListener('scroll', updateMenuPosition, true)
    window.removeEventListener('resize', updateMenuPosition)
  }
})

const menuStyle = computed(() => ({
  top: `${menuPosition.value.top}px`,
  left: `${menuPosition.value.left}px`,
  minWidth: `${menuPosition.value.width}px`,
  maxWidth: '400px', // Prevent menu from getting too wide
  maxHeight: '24rem', // 96 * 0.25rem = 24rem (same as max-h-96)
  overflowY: 'auto' as const,
  overflowX: 'hidden' as const,
}))

// Prevent menu clicks from bubbling (so it doesn't trigger outside click handlers)
function handleMenuClick(event: MouseEvent) {
  event.stopPropagation()
}

function getOptionIndex(option: DropdownOption): number {
  const allOptions = getAllOptions()
  return allOptions.findIndex(o => o.value === option.value)
}

function getAllOptions(): DropdownOption[] {
  if (props.options) {
    return props.options
  }

  if (props.optionGroups) {
    return props.optionGroups.flatMap(group => group.options || [])
  }

  return []
}

function isOptionFocused(option: DropdownOption, directIndex?: number): boolean {
  const index = directIndex !== undefined ? directIndex : getOptionIndex(option)
  return props.focusedIndex === index && props.localValue !== option.value
}

function handleSelect(value: string) {
  emit('select', value)
}

function handleKeydown(event: KeyboardEvent, value: string) {
  emit('keydown', event, value)
}
</script>

<template>
  <!-- Inline dropdown menu with simple options -->
  <ul
    v-if="inline && options && isOpen"
    role="listbox"
    :aria-label="ariaLabel"
    class="dropdown-content menu bg-base-100 rounded-box z-[1] mt-2 w-52 shadow-lg border border-base-300 gap-1"
  >
    <li
      v-for="(option, index) in options"
      :key="option.value"
      role="presentation"
    >
      <DropdownOptionItem
        :option="option"
        :option-id="getOptionId(index)"
        :is-selected="localValue === option.value"
        @select="handleSelect"
        @keydown="handleKeydown"
      />
    </li>
  </ul>

  <!-- Inline dropdown menu with option groups -->
  <ul
    v-if="inline && optionGroups && isOpen"
    role="listbox"
    :aria-label="ariaLabel"
    class="dropdown-content menu bg-base-100 rounded-box z-[1] mt-2 w-56 shadow-lg border border-base-300 max-h-96 overflow-y-auto gap-1"
  >
    <template
      v-for="group in optionGroups"
      :key="group.key || group.category"
    >
      <li>
        <h2 class="menu-title flex items-center gap-1">
          <i
            v-if="getCategoryIconClass(group)"
            :class="getCategoryIconClass(group)"
          />
          {{ getCategoryLabel(group) }}
        </h2>
      </li>
      <ul class="flex flex-col gap-1">
        <li
          v-for="option in group.options || []"
          :key="option.value"
          role="presentation"
        >
          <DropdownOptionItem
            :option="option"
            :option-id="getOptionId(getOptionIndex(option))"
            :is-selected="localValue === option.value"
            :show-badge-inline="true"
            @select="handleSelect"
            @keydown="handleKeydown"
          />
        </li>
      </ul>
    </template>
  </ul>

  <!-- Standard dropdown with option groups -->
  <Teleport
    v-if="!inline && optionGroups && isOpen"
    to="body"
  >
    <ul
      role="listbox"
      :aria-labelledby="ariaLabelledby"
      class="dropdown-content menu bg-base-100 rounded-box z-[1000] shadow-lg border border-base-300 gap-4"
      style="position: fixed;"
      :style="menuStyle"
      @click="handleMenuClick"
    >
      <template
        v-for="group in optionGroups"
        :key="group.key || group.category"
      >
        <li>
          <h2 class="menu-title flex items-center gap-1">
            <i
              v-if="getCategoryIconClass(group)"
              :class="getCategoryIconClass(group)"
            />
            {{ getCategoryLabel(group) }}
          </h2>
          <ul class="flex flex-col gap-1">
            <li
              v-for="option in group.options || []"
              :key="option.value"
              role="presentation"
            >
              <DropdownOptionItem
                :option="option"
                :option-id="getOptionId(getOptionIndex(option))"
                :is-selected="localValue === option.value"
                :show-badge-inline="true"
                @select="handleSelect"
                @keydown="handleKeydown"
              />
            </li>
          </ul>
        </li>
      </template>
    </ul>
  </Teleport>

  <!-- Standard dropdown with simple options -->
  <Teleport
    v-if="!inline && options && isOpen"
    to="body"
  >
    <ul
      role="listbox"
      :aria-labelledby="ariaLabelledby"
      class="dropdown-content menu bg-base-100 rounded-box z-[1000] shadow-lg border border-base-300 gap-1"
      style="position: fixed;"
      :style="menuStyle"
      @click="handleMenuClick"
    >
      <li
        v-for="(option, index) in options"
        :key="option.value"
        role="presentation"
      >
        <DropdownOptionItem
          :option="option"
          :option-id="getOptionId(index)"
          :is-selected="localValue === option.value"
          :is-focused="isOptionFocused(option, index)"
          @select="handleSelect"
          @keydown="handleKeydown"
        />
      </li>
    </ul>
  </Teleport>
</template>

<style scoped>
/* Force single column layout and proper scrolling for teleported menus */
.dropdown-content.menu {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap !important;
}

/* Ensure menu items don't wrap */
.dropdown-content.menu li {
  width: 100%;
  flex-shrink: 0;
}
</style>
