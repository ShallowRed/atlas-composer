<script setup lang="ts">
import type { DropdownOption } from './DropdownControl.vue'
import { ref } from 'vue'
import DropdownOptionIcon from './DropdownOptionIcon.vue'
import DropdownSelectedOption from './DropdownSelectedOption.vue'

interface Props {
  isOpen: boolean
  disabled: boolean
  selectedOption: DropdownOption | null
  ariaHaspopup?: boolean
  ariaExpanded?: boolean
  ariaLabel?: string
  ariaLabelledby?: string
  ariaActivedescendant?: string
  inline?: boolean
  icon?: string
  showSelectedIcon?: boolean
  showStaticIcon?: boolean
  showSelectedLabel?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  ariaHaspopup: true,
  ariaExpanded: false,
  ariaLabel: undefined,
  ariaLabelledby: undefined,
  ariaActivedescendant: undefined,
  inline: false,
  icon: undefined,
  showSelectedIcon: true,
  showStaticIcon: true,
  showSelectedLabel: true,
  size: 'md',
})

const emit = defineEmits<{
  click: []
  keydown: [event: KeyboardEvent]
  blur: [event: FocusEvent]
}>()

const buttonRef = ref<HTMLElement | null>(null)

// Map size to button and icon classes for inline buttons
const sizeClasses = {
  'xs': { button: 'btn-xs', text: 'text-xs', icon: 'text-xs' },
  'sm': { button: 'btn-sm', text: 'text-sm', icon: 'text-base' },
  'md': { button: 'btn-md', text: 'text-base', icon: 'text-lg' },
  'lg': { button: 'btn-lg', text: 'text-lg', icon: 'text-xl' },
  'xl': { button: 'btn-xl', text: 'text-xl', icon: 'text-2xl' },
  '2xl': { button: 'text-2xl', text: 'text-2xl', icon: 'text-3xl' },
}

const currentSizeClasses = sizeClasses[props.size]

// Expose the ref so parent can access it
defineExpose({
  buttonRef,
})
</script>

<template>
  <!-- Inline button (navbar, etc.) -->
  <button
    v-if="inline"
    ref="buttonRef"
    type="button"
    class="btn btn-ghost font-normal rounded-btn"
    :class="[
      currentSizeClasses.button,
      currentSizeClasses.text,
      { 'btn-disabled': disabled },
    ]"
    :disabled="disabled"
    :aria-haspopup="ariaHaspopup"
    :aria-expanded="ariaExpanded"
    :aria-label="ariaLabel"
    :aria-activedescendant="ariaActivedescendant"
    @click="emit('click')"
    @keydown="emit('keydown', $event)"
    @blur="emit('blur', $event)"
  >
    <DropdownOptionIcon
      v-if="showSelectedIcon && selectedOption?.icon"
      :icon="selectedOption.icon"
      :class="currentSizeClasses.icon"
    />
    <i
      v-else-if="showStaticIcon && icon"
      :class="[icon, currentSizeClasses.icon]"
    />
    <span
      v-if="showSelectedLabel"
      class="ml-1"
    >
      {{ selectedOption?.label || '' }}
    </span>
  </button>

  <!-- Standard button (fieldset) -->
  <button
    v-else
    ref="buttonRef"
    type="button"
    class="btn btn-soft w-full justify-between border bg-base-200/30 text-sm font-normal"
    :class="{ 'btn-disabled': disabled }"
    :disabled="disabled"
    :aria-haspopup="ariaHaspopup"
    :aria-expanded="ariaExpanded"
    :aria-labelledby="ariaLabelledby"
    :aria-activedescendant="ariaActivedescendant"
    @click="emit('click')"
    @keydown="emit('keydown', $event)"
    @blur="emit('blur', $event)"
  >
    <DropdownSelectedOption :selected-option="selectedOption" />
    <i
      class="ri-arrow-down-s-line text-lg"
      :class="{ 'rotate-180': isOpen }"
    />
  </button>
</template>

<style scoped>
.ri-arrow-down-s-line {
  transition: transform 0.2s ease;
}

.rotate-180 {
  transform: rotate(180deg);
}
</style>
