<script setup lang="ts">
import type { DropdownOption } from './DropdownControl.vue'
import { computed } from 'vue'
import DropdownOptionIcon from './DropdownOptionIcon.vue'

interface Props {
  selectedOption: DropdownOption | null
  showBadge?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showBadge: true,
})

const isBadgeIcon = computed(() => {
  return props.selectedOption?.badge?.startsWith('ri-')
})

const badgeClasses = computed(() => {
  if (!props.selectedOption?.badge)
    return ''
  return props.selectedOption.badge
})
</script>

<template>
  <span
    v-if="selectedOption"
    class="flex items-center text-left leading-tight gap-2"
  >
    <DropdownOptionIcon :icon="selectedOption.icon" />

    <i
      v-if="showBadge && selectedOption.badge && isBadgeIcon"
      :class="badgeClasses"
      class="text-sm"
    />
    <span
      v-else-if="showBadge && selectedOption.badge"
      class="badge badge-soft badge-xs"
    >{{ selectedOption.badge }}</span>
    {{ selectedOption.translated ? selectedOption.label : $t(selectedOption.label) }}
  </span>
  <span
    v-else
    class="text-base-content/50"
  >
    Select...
  </span>
</template>
