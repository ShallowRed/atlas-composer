<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import DropdownButton from './DropdownButton.vue'
import DropdownMenu from './DropdownMenu.vue'

// Export interfaces for use in other components
export interface DropdownOption {
  value: string
  label: string
  icon?: string
  badge?: string
  /** If true, label is already translated and should not be passed through $t(). Defaults to false (label is a translation key) */
  translated?: boolean
}

export interface DropdownOptionGroup {
  key?: string
  label?: string
  category?: string
  options?: DropdownOption[]
}

// Local aliases for convenience
type Option = DropdownOption
type OptionGroup = DropdownOptionGroup

interface Props {
  label: string
  icon?: string
  modelValue?: string | null
  disabled?: boolean
  options?: Option[]
  optionGroups?: OptionGroup[]
  inline?: boolean // For inline use (e.g., in navbar) - removes fieldset wrapper
  showSelectedIcon?: boolean // For inline buttons - whether to show selected option's icon (default: true)
  showStaticIcon?: boolean // For inline buttons - whether to show the static icon (default: true)
  showSelectedLabel?: boolean // For inline buttons - whether to show selected option's label (default: true)
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' // Button size for inline buttons (default: 'md')
}

const props = withDefaults(defineProps<Props>(), {
  icon: undefined,
  modelValue: undefined,
  disabled: false,
  options: undefined,
  optionGroups: undefined,
  inline: false,
  showSelectedIcon: true,
  showStaticIcon: true,
  showSelectedLabel: true,
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
}>()

const isOpen = ref(false)
const buttonComponentRef = ref<InstanceType<typeof DropdownButton> | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const focusedIndex = ref(-1)
const isNavigating = ref(false) // Track if we're actively navigating with arrows

// Computed to get the actual button element from the component ref
const buttonRef = computed(() => buttonComponentRef.value?.buttonRef || null)

const localValue = computed({
  get: () => props.modelValue,
  set: (value: string | undefined) => {
    if (value !== undefined) {
      emit('update:modelValue', value)
      emit('change', value)
    }
  },
})

// Get the selected option label and icon for display
const selectedOption = computed(() => {
  if (!localValue.value)
    return null

  if (props.options) {
    return props.options.find(opt => opt.value === localValue.value)
  }

  if (props.optionGroups) {
    for (const group of props.optionGroups) {
      const found = group.options?.find(opt => opt.value === localValue.value)
      if (found)
        return found
    }
  }

  return null
})

// Get flat list of all options for keyboard navigation
const allOptions = computed<Option[]>(() => {
  if (props.options) {
    return props.options
  }

  if (props.optionGroups) {
    return props.optionGroups.flatMap(group => group.options || [])
  }

  return []
})

function selectOption(value: string, keepOpen = false) {
  localValue.value = value
  if (!keepOpen) {
    closeDropdown()
  }
}

function handleBlur(event: FocusEvent) {
  // Don't close if we're actively navigating with arrow keys
  if (isNavigating.value) {
    return
  }

  // Check if the new focus target is within the dropdown
  const relatedTarget = event.relatedTarget as Node | null
  if (dropdownRef.value && relatedTarget && dropdownRef.value.contains(relatedTarget)) {
    return // Keep dropdown open if focus moved to an option
  }

  setTimeout(() => {
    if (!isNavigating.value) {
      isOpen.value = false
      focusedIndex.value = -1
    }
  }, 150)
}

function handleKeyDown(event: KeyboardEvent) {
  if (props.disabled)
    return

  switch (event.key) {
    case 'Enter':
    case ' ': // Space
      event.preventDefault()
      if (!isOpen.value) {
        openDropdown()
      }
      else if (focusedIndex.value >= 0 && focusedIndex.value < allOptions.value.length) {
        const option = allOptions.value[focusedIndex.value]
        if (option) {
          selectOption(option.value)
        }
      }
      break

    case 'Escape':
      event.preventDefault()
      if (isOpen.value) {
        closeDropdown()
      }
      break

    case 'ArrowDown':
      event.preventDefault()
      // Only navigate when dropdown is open
      if (isOpen.value) {
        // Navigate and immediately select the next option (keep dropdown open)
        isNavigating.value = true
        const nextIndex = Math.min(focusedIndex.value + 1, allOptions.value.length - 1)
        focusedIndex.value = nextIndex
        const nextOption = allOptions.value[nextIndex]
        if (nextOption) {
          selectOption(nextOption.value, true) // Keep dropdown open
        }
        setTimeout(() => {
          isNavigating.value = false
        }, 50)
      }
      break

    case 'ArrowUp':
      event.preventDefault()
      // Only navigate when dropdown is open
      if (isOpen.value) {
        // Navigate and immediately select the previous option (keep dropdown open)
        isNavigating.value = true
        const prevIndex = Math.max(focusedIndex.value - 1, 0)
        focusedIndex.value = prevIndex
        const prevOption = allOptions.value[prevIndex]
        if (prevOption) {
          selectOption(prevOption.value, true) // Keep dropdown open
        }
        setTimeout(() => {
          isNavigating.value = false
        }, 50)
      }
      break

    case 'ArrowRight':
      // Right arrow changes selection without opening (with looping)
      event.preventDefault()
      if (!isOpen.value) {
        const currentIndex = allOptions.value.findIndex(opt => opt.value === localValue.value)
        // Loop to start if at the end
        const nextIndex = currentIndex >= allOptions.value.length - 1 ? 0 : currentIndex + 1
        const nextOption = allOptions.value[nextIndex]
        if (nextOption) {
          selectOption(nextOption.value)
        }
      }
      else {
        focusedIndex.value = Math.min(focusedIndex.value + 1, allOptions.value.length - 1)
      }
      break

    case 'ArrowLeft':
      // Left arrow changes selection without opening (with looping)
      event.preventDefault()
      if (!isOpen.value) {
        const currentIndex = allOptions.value.findIndex(opt => opt.value === localValue.value)
        // Loop to end if at the start
        const prevIndex = currentIndex <= 0 ? allOptions.value.length - 1 : currentIndex - 1
        const prevOption = allOptions.value[prevIndex]
        if (prevOption) {
          selectOption(prevOption.value)
        }
      }
      else {
        focusedIndex.value = Math.max(focusedIndex.value - 1, 0)
      }
      break

    case 'Home':
      if (isOpen.value) {
        event.preventDefault()
        focusedIndex.value = 0
      }
      break

    case 'End':
      if (isOpen.value) {
        event.preventDefault()
        focusedIndex.value = allOptions.value.length - 1
      }
      break

    case 'Tab':
      if (isOpen.value) {
        closeDropdown()
      }
      break
  }
}

function openDropdown() {
  isOpen.value = true
  // Set initial focus to selected option or first option
  const selectedIndex = allOptions.value.findIndex(opt => opt.value === localValue.value)
  focusedIndex.value = selectedIndex >= 0 ? selectedIndex : 0
}

function closeDropdown() {
  isOpen.value = false
  focusedIndex.value = -1
  // Focus the button so we can immediately use arrow keys to navigate
  nextTick(() => {
    buttonComponentRef.value?.buttonRef?.focus()
  })
}

function handleOptionKeyDown(event: KeyboardEvent, value: string) {
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault()
      selectOption(value)
      break
  }
}

// Get option ID for aria-activedescendant
function getOptionId(index: number): string {
  return `dropdown-option-${index}`
}

// Watch focusedIndex to scroll the option into view
watch(focusedIndex, (newIndex) => {
  if (newIndex >= 0 && isOpen.value) {
    // Use nextTick to ensure the DOM has been updated with new focus state
    nextTick(() => {
      const optionElement = document.getElementById(getOptionId(newIndex))
      if (optionElement) {
        // Scroll the option into view smoothly
        optionElement.scrollIntoView({
          // behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        })
      }
    })
  }
})
</script>

<template>
  <!-- Inline version (for navbar, etc.) -->
  <div
    v-if="inline"
    ref="dropdownRef"
    class="dropdown dropdown-end"
    :class="{ 'dropdown-open': isOpen }"
  >
    <DropdownButton
      ref="buttonComponentRef"
      :is-open="isOpen"
      :disabled="disabled"
      :selected-option="selectedOption ?? null"
      :aria-expanded="isOpen"
      :aria-label="label || 'Select option'"
      :aria-activedescendant="focusedIndex >= 0 ? getOptionId(focusedIndex) : undefined"
      :inline="true"
      :icon="icon"
      :show-selected-icon="showSelectedIcon"
      :show-static-icon="showStaticIcon"
      :show-selected-label="showSelectedLabel"
      :size="size"
      @click="isOpen ? closeDropdown() : openDropdown()"
      @keydown="handleKeyDown"
      @blur="handleBlur"
    />

    <DropdownMenu
      :options="options"
      :option-groups="optionGroups"
      :is-open="isOpen"
      :local-value="localValue"
      :aria-label="label || 'Options'"
      :inline="true"
      :focused-index="focusedIndex"
      :size="size"
      @select="selectOption"
      @keydown="handleOptionKeyDown"
    />
  </div>

  <!-- Standard fieldset version -->
  <div
    v-else
    class="flex flex-col"
  >
    <label
      id="dropdown-label"
      class="label font-medium text-sm mb-2"
    >
      <span class="label-text flex items-center gap-2">
        <i
          v-if="icon"
          :class="icon"
        />
        {{ label }}
      </span>
    </label>

    <div
      ref="dropdownRef"
      class="dropdown w-full"
      :class="{ 'dropdown-open': isOpen }"
    >
      <DropdownButton
        ref="buttonComponentRef"
        :is-open="isOpen"
        :disabled="disabled"
        :selected-option="selectedOption ?? null"
        :aria-expanded="isOpen"
        aria-labelledby="dropdown-label"
        :aria-activedescendant="focusedIndex >= 0 ? getOptionId(focusedIndex) : undefined"
        @click="isOpen ? closeDropdown() : openDropdown()"
        @keydown="handleKeyDown"
        @blur="handleBlur"
      />

      <DropdownMenu
        :options="options"
        :option-groups="optionGroups"
        :is-open="isOpen"
        :local-value="localValue"
        aria-labelledby="dropdown-label"
        :focused-index="focusedIndex"
        :button-ref="buttonRef"
        @select="selectOption"
        @keydown="handleOptionKeyDown"
      />
    </div>
  </div>
</template>

<style scoped>
/* Override DaisyUI CSS focus behavior - we control open/close with JS */
.dropdown:not(.dropdown-open) .dropdown-content {
  display: none !important;
}

.dropdown.dropdown-open .dropdown-content {
  /* position: static; */
  display: block !important;
}

/* Visible focus state for button - Thick outline for visibility */
.btn:focus, .btn:focus-visible {
  outline: 2px solid var(--color-neutral);
  outline-offset: 2px;
}

/* Remove dropdown wrapper hover effect for inline dropdowns - button handles its own hover */
.dropdown:where(.dropdown-end) {
  background: none !important;
  padding: 0 !important;
}

/* Ensure dropdown animations are smooth */
/* .dropdown-content {
  animation: dropdown-appear 0.2s ease-out;
} */

@keyframes dropdown-appear {
  from {
    opacity: 0;
    transform: translateY(-1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
