<script setup lang="ts">
import type { DropdownOption, DropdownOptionGroup } from './DropdownControl.vue'
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
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  // The anchor-name of the button that the menu opens next to
  anchor: string
  // The identifier of an option is this prefix and its index, which aria-activedescendant of the button reads
  optionIdPrefix: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [value: string]
  keydown: [event: KeyboardEvent, value: string]
}>()

function getOptionId(index: number): string {
  return `${props.optionIdPrefix}-${index}`
}

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

// The menu opens as a popover: the top layer keeps it out of the overflow of its containers
function showPopover(element: unknown) {
  if (element instanceof HTMLElement && !element.matches(':popover-open')) {
    element.showPopover()
  }
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
    :ref="showPopover"
    role="listbox"
    :aria-label="ariaLabel"
    popover="manual"
    :style="{ positionAnchor: anchor }"
    class="dropdown dropdown-end dropdown-content menu bg-base-100 rounded-box w-52 shadow-lg border border-base-300 gap-1"
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
    :ref="showPopover"
    role="listbox"
    :aria-label="ariaLabel"
    popover="manual"
    :style="{ positionAnchor: anchor }"
    class="dropdown dropdown-end dropdown-content menu bg-base-100 rounded-box w-56 shadow-lg border border-base-300 max-h-96 overflow-y-auto gap-1"
  >
    <template
      v-for="group in optionGroups"
      :key="group.key ?? group.label"
    >
      <li>
        <h2 class="menu-title flex items-center gap-1">
          <i
            v-if="group.icon"
            :class="group.icon"
          />
          {{ group.label }}
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
  <ul
    v-if="!inline && optionGroups && isOpen"
    :ref="showPopover"
    role="listbox"
    :aria-labelledby="ariaLabelledby"
    popover="manual"
    :style="{ positionAnchor: anchor }"
    class="dropdown dropdown-content menu labelled-menu bg-base-100 rounded-box shadow-lg border border-base-300 gap-4"
    @click="handleMenuClick"
  >
    <template
      v-for="group in optionGroups"
      :key="group.key ?? group.label"
    >
      <li>
        <h2 class="menu-title flex items-center gap-1">
          <i
            v-if="group.icon"
            :class="group.icon"
          />
          {{ group.label }}
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

  <!-- Standard dropdown with simple options -->
  <ul
    v-if="!inline && options && isOpen"
    :ref="showPopover"
    role="listbox"
    :aria-labelledby="ariaLabelledby"
    popover="manual"
    :style="{ positionAnchor: anchor }"
    class="dropdown dropdown-content menu labelled-menu bg-base-100 rounded-box shadow-lg border border-base-300 gap-1"
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
</template>

<style scoped>
/* Force single column layout and proper scrolling */
.dropdown-content.menu {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap !important;
}

/* The menu opens on the other side of its button when the viewport has no room for it */
.dropdown[popover] {
  inset: auto;
  margin: 0.5rem 0;
  position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline;
}

/* The menu of a labelled dropdown: at least as wide as its button, scrolled past 24rem */
.labelled-menu {
  min-width: anchor-size(width);
  max-width: 400px;
  max-height: 24rem;
  overflow: hidden auto;
}

/* Ensure menu items don't wrap */
.dropdown-content.menu li {
  width: 100%;
  flex-shrink: 0;
}
</style>
