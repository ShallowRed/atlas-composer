<script setup lang="ts">
import type { DropdownOption } from './DropdownControl.vue'
import DropdownOptionIcon from './DropdownOptionIcon.vue'

interface Props {
  selectedOption: DropdownOption | null
  showBadge?: boolean
}

withDefaults(defineProps<Props>(), {
  showBadge: true,
})
</script>

<template>
  <span
    v-if="selectedOption"
    class="flex items-center text-left leading-tight gap-2"
  >
    <DropdownOptionIcon :icon="selectedOption.icon" />

    <span
      v-if="showBadge && selectedOption.badge"
      class="badge badge-soft badge-xs"
    >{{ selectedOption.badge }}</span>
    {{ $t(selectedOption.label) }}
  </span>
  <span
    v-else
    class="text-base-content/50"
  >
    Select...
  </span>
</template>
