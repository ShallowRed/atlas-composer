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
}

withDefaults(defineProps<Props>(), {
  ariaHaspopup: true,
  ariaExpanded: false,
  ariaLabel: undefined,
  ariaLabelledby: undefined,
  ariaActivedescendant: undefined,
  inline: false,
  icon: undefined,
})

const emit = defineEmits<{
  click: []
  keydown: [event: KeyboardEvent]
  blur: [event: FocusEvent]
}>()

const buttonRef = ref<HTMLElement | null>(null)

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
    class="font-normal text-lg cursor-pointer w-12"
    :class="{ 'btn-disabled': disabled }"
    :disabled="disabled"
    :aria-haspopup="ariaHaspopup"
    :aria-expanded="ariaExpanded"
    :aria-label="ariaLabel"
    :aria-activedescendant="ariaActivedescendant"
    @click="emit('click')"
    @keydown="emit('keydown', $event)"
    @blur="emit('blur', $event)"
  >
    <i
      v-if="icon"
      :class="icon"
    />
    <DropdownOptionIcon
      v-if="selectedOption"
      :icon="selectedOption.icon"
    />
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
