<script setup lang="ts">
import type { DropdownOption, DropdownOptionGroup } from './DropdownControl.vue'
import DropdownOptionItem from './DropdownOptionItem.vue'

interface Props {
  options?: DropdownOption[]
  optionGroups?: DropdownOptionGroup[]
  isOpen: boolean
  localValue?: string
  ariaLabelledby?: string
  ariaLabel?: string
  inline?: boolean
  focusedIndex: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [value: string]
  keydown: [event: KeyboardEvent, value: string]
}>()

function getOptionId(index: number): string {
  return `dropdown-option-${index}`
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
  <!-- Inline dropdown menu -->
  <ul
    v-if="inline && options && isOpen"
    role="listbox"
    :aria-label="ariaLabel"
    class="dropdown-content menu bg-base-100 rounded-box z-[1] mt-2 w-52 px-2 pb-2 pt-0 shadow-lg border border-base-300 gap-1"
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

  <!-- Standard dropdown with option groups -->
  <ul
    v-else-if="!inline && optionGroups && isOpen"
    role="listbox"
    :aria-labelledby="ariaLabelledby"
    class="dropdown-content menu bg-base-100 rounded-box z-[100] w-full max-h-96 overflow-y-auto p-2 shadow-lg border border-base-300 mt-2 gap-1"
  >
    <template
      v-for="group in optionGroups"
      :key="group.key || group.category"
    >
      <li
        class="menu-title"
        role="presentation"
      >
        {{ group.label || group.category }}
      </li>
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
    </template>
  </ul>

  <!-- Standard dropdown with simple options -->
  <ul
    v-else-if="!inline && options && isOpen"
    role="listbox"
    :aria-labelledby="ariaLabelledby"
    class="dropdown-content menu bg-base-100 rounded-box z-[100] w-full max-h-96 overflow-y-auto px-2 pt-0 shadow-lg border border-base-300 mt-2"
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
