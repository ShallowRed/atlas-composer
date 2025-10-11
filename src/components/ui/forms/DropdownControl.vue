<script setup lang="ts">
import { computed, ref } from 'vue'

// Export interfaces for use in other components
export interface DropdownOption {
  value: string
  label: string
  icon?: string
  badge?: string
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
  modelValue?: string
  disabled?: boolean
  options?: Option[]
  optionGroups?: OptionGroup[]
  inline?: boolean // For inline use (e.g., in navbar) - removes fieldset wrapper
}

const props = withDefaults(defineProps<Props>(), {
  icon: undefined,
  modelValue: undefined,
  disabled: false,
  options: undefined,
  optionGroups: undefined,
  inline: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
}>()

const isOpen = ref(false)
const buttonRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const focusedIndex = ref(-1)
const isNavigating = ref(false) // Track if we're actively navigating with arrows

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
  buttonRef.value?.focus()
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
</script>

<template>
  <!-- Inline version (for navbar, etc.) -->
  <div
    v-if="inline"
    ref="dropdownRef"
    class="dropdown dropdown-end"
    :class="{ 'dropdown-open': isOpen }"
  >
    <button
      ref="buttonRef"
      type="button"
      class="btn btn-ghost"
      :class="{ 'btn-disabled': disabled }"
      :disabled="disabled"
      :aria-haspopup="true"
      :aria-expanded="isOpen"
      :aria-label="label || 'Select option'"
      :aria-activedescendant="focusedIndex >= 0 ? getOptionId(focusedIndex) : undefined"
      @click="isOpen ? closeDropdown() : openDropdown()"
      @keydown="handleKeyDown"
      @blur="handleBlur"
    >
      <i
        v-if="icon"
        :class="icon"
      />
      <span
        v-if="selectedOption && selectedOption.icon && !selectedOption.icon.startsWith('ri-')"
      >
        {{ selectedOption.icon }}
      </span>
    </button>

    <!-- Dropdown content for inline version -->
    <ul
      v-if="options && isOpen"
      role="listbox"
      :aria-label="label || 'Options'"
      class="dropdown-content menu bg-base-100 rounded-box z-[1] mt-2 w-52 p-2 shadow-lg border border-base-300"
    >
      <li
        v-for="(option, index) in options"
        :key="option.value"
        role="presentation"
      >
        <button
          :id="getOptionId(index)"
          type="button"
          role="option"
          :aria-selected="localValue === option.value"
          :class="{
            'bg-primary text-primary-content': localValue === option.value,
            'bg-base-200': focusedIndex === index && localValue !== option.value,
          }"
          @click="selectOption(option.value)"
          @keydown="handleOptionKeyDown($event, option.value)"
        >
          <span
            v-if="option.icon && !option.icon.startsWith('ri-')"
            class="text-base"
          >
            {{ option.icon }}
          </span>
          <i
            v-else-if="option.icon"
            :class="option.icon"
          />
          <span
            v-if="option.badge"
            class="badge badge-primary badge-sm"
          >{{ option.badge }}</span>
          {{ $t(option.label) }}
        </button>
      </li>
    </ul>
  </div>

  <!-- Standard fieldset version -->
  <fieldset
    v-else
    class="fieldset form-control flex flex-col"
  >
    <legend
      id="dropdown-label"
      class="fieldset-legend text-xl"
    >
      <span class="label-text flex items-center gap-2">
        <i
          v-if="icon"
          :class="icon"
        />
        {{ label }}
      </span>
    </legend>

    <div
      ref="dropdownRef"
      class="dropdown w-full"
      :class="{ 'dropdown-open': isOpen }"
    >
      <button
        ref="buttonRef"
        type="button"
        class="btn w-full justify-between border bg-base-200/30"
        :class="{ 'btn-disabled': disabled }"
        :disabled="disabled"
        :aria-haspopup="true"
        :aria-expanded="isOpen"
        aria-labelledby="dropdown-label"
        :aria-activedescendant="focusedIndex >= 0 ? getOptionId(focusedIndex) : undefined"
        @click="isOpen ? closeDropdown() : openDropdown()"
        @keydown="handleKeyDown"
        @blur="handleBlur"
      >
        <span
          v-if="selectedOption"
          class="flex items-center gap-2"
        >
          <!-- Icon (emoji/text or icon class) -->
          <span
            v-if="selectedOption.icon && !selectedOption.icon.startsWith('ri-')"
            class="text-base"
          >
            {{ selectedOption.icon }}
          </span>
          <i
            v-else-if="selectedOption.icon"
            :class="selectedOption.icon"
          />

          <!-- Badge -->
          <span
            v-if="selectedOption.badge"
            class="badge badge-primary badge-sm"
          >{{ selectedOption.badge }}</span>
          {{ $t(selectedOption.label) }}
        </span>
        <span
          v-else
          class="text-base-content/50"
        >Select...</span>
        <i
          class="ri-arrow-down-s-line text-lg"
          :class="{ 'rotate-180': isOpen }"
        />
      </button>

      <!-- Dropdown with Option Groups -->
      <ul
        v-if="optionGroups && isOpen"
        role="listbox"
        aria-labelledby="dropdown-label"
        class="dropdown-content menu bg-base-100 rounded-box z-[100] w-full max-h-96 overflow-y-auto p-2 shadow-lg border border-base-300"
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
            <button
              :id="getOptionId(allOptions.findIndex(o => o.value === option.value))"
              type="button"
              role="option"
              :aria-selected="localValue === option.value"
              :class="{
                'bg-primary text-primary-content': localValue === option.value,
                'bg-base-200': focusedIndex === allOptions.findIndex(o => o.value === option.value) && localValue !== option.value,
              }"
              @click="selectOption(option.value)"
              @keydown="handleOptionKeyDown($event, option.value)"
            >
              <!-- Icon (emoji/text or icon class) -->
              <span
                v-if="option.icon && !option.icon.startsWith('ri-')"
                class="text-base"
              >
                {{ option.icon }}
              </span>
              <i
                v-else-if="option.icon"
                :class="option.icon"
              />

              <!-- Badge -->
              <span
                v-if="option.badge"
                class="badge badge-primary badge-sm"
              >{{ option.badge }}</span>
              {{ $t(option.label) }}
            </button>
          </li>
        </template>
      </ul>

      <!-- Dropdown with Simple Options -->
      <ul
        v-else-if="options && isOpen"
        role="listbox"
        aria-labelledby="dropdown-label"
        class="dropdown-content menu bg-base-100 rounded-box z-[100] w-full max-h-96 overflow-y-auto p-2 shadow-lg border border-base-300"
      >
        <li
          v-for="(option, index) in options"
          :key="option.value"
          role="presentation"
        >
          <button
            :id="getOptionId(index)"
            type="button"
            role="option"
            :aria-selected="localValue === option.value"
            :class="{
              'bg-primary text-primary-content': localValue === option.value,
              'bg-base-200': focusedIndex === index && localValue !== option.value,
            }"
            @click="selectOption(option.value)"
            @keydown="handleOptionKeyDown($event, option.value)"
          >
            <!-- Icon (emoji/text or icon class) -->
            <span
              v-if="option.icon && !option.icon.startsWith('ri-')"
              class="text-base"
            >
              {{ option.icon }}
            </span>
            <i
              v-else-if="option.icon"
              :class="option.icon"
            />

            <!-- Badge -->
            <span
              v-if="option.badge"
              class="badge badge-primary badge-sm"
            >{{ option.badge }}</span>
            {{ $t(option.label) }}
          </button>
        </li>
      </ul>
    </div>
  </fieldset>
</template>

<style scoped>
.ri-arrow-down-s-line {
  transition: transform 0.2s ease;
}

.rotate-180 {
  transform: rotate(180deg);
}

/* Override DaisyUI CSS focus behavior - we control open/close with JS */
.dropdown:not(.dropdown-open) .dropdown-content {
  display: none !important;
}

.dropdown.dropdown-open .dropdown-content {
  display: block !important;
}

/* Visible focus state for button - Thick outline for visibility */
.btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Keyboard-focused option highlight - more visible */
button[role="option"].bg-base-200 {
  background-color: hsl(var(--b2));
  outline: 2px solid hsl(var(--p));
  outline-offset: -2px;
}

/* Ensure dropdown animations are smooth */
.dropdown-content {
  animation: dropdown-appear 0.2s ease-out;
}

@keyframes dropdown-appear {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
