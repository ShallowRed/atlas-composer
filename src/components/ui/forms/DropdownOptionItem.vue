<script setup lang="ts">
import type { DropdownOption } from './DropdownControl.vue'
import { computed } from 'vue'
import DropdownOptionIcon from './DropdownOptionIcon.vue'

interface Props {
  option: DropdownOption
  optionId: string
  isSelected: boolean
  isFocused?: boolean
  showBadgeInline?: boolean // When true, badge is shown inline with label (for option groups)
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [value: string]
  keydown: [event: KeyboardEvent, value: string]
}>()

const isBadgeIcon = computed(() => {
  return props.option.badge?.startsWith('ri-')
})

const badgeClasses = computed(() => {
  if (!props.option.badge)
    return ''
  return props.option.badge
})

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
    :class="{
      'bg-primary/10': isSelected,
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
      <span class="flex items-center gap-1.5">
        <i
          v-if="isBadgeIcon"
          :class="badgeClasses"
          class="text-sm"
        />
        <span
          v-else
          class="badge badge-soft badge-xs"
        >{{ option.badge }}</span>
        {{ option.translated ? option.label : $t(option.label) }}
      </span>
    </div>

    <!-- Standard layout: badge icon (left), label -->
    <template v-else>
      <i
        v-if="option.badge && isBadgeIcon"
        :class="badgeClasses"
        class="text-sm shrink-0"
      />
      <span
        v-else-if="option.badge"
        class="badge badge-soft badge-xs"
      >{{ option.badge }}</span>
      {{ option.translated ? option.label : $t(option.label) }}
    </template>
  </button>
</template>
