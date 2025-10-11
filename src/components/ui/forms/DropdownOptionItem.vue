<script setup lang="ts">
import type { DropdownOption } from './DropdownControl.vue'
import DropdownOptionIcon from './DropdownOptionIcon.vue'

interface Props {
  option: DropdownOption
  optionId: string
  isSelected: boolean
  isFocused?: boolean
  showBadgeInline?: boolean // When true, badge is shown inline with label (for option groups)
}

defineProps<Props>()

const emit = defineEmits<{
  select: [value: string]
  keydown: [event: KeyboardEvent, value: string]
}>()

function handleClick(value: string) {
  emit('select', value)
}

function handleKeyDown(event: KeyboardEvent, value: string) {
  emit('keydown', event, value)
}
</script>

<template>
  <button
    :id="optionId"
    type="button"
    role="option"
    :aria-selected="isSelected"
    class="mt-2"
    :class="{
      'bg-primary text-primary-content': isSelected,
      'bg-base-200': isFocused,
    }"
    @click="handleClick(option.value)"
    @keydown="handleKeyDown($event, option.value)"
  >
    <DropdownOptionIcon :icon="option.icon" />

    <!-- Badge shown inline with label (for option groups) -->
    <div
      v-if="option.badge && showBadgeInline"
      class="width-full flex items-center justify-between gap-2"
    >
      {{ $t(option.label) }}
      <span class="badge badge-soft badge-xs">{{ option.badge }}</span>
    </div>

    <!-- Standard layout: icon, badge, label -->
    <template v-else>
      <span
        v-if="option.badge"
        class="badge badge-soft badge-xs"
      >{{ option.badge }}</span>
      {{ $t(option.label) }}
    </template>
  </button>
</template>
