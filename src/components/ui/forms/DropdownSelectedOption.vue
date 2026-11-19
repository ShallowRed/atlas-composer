<script setup lang="ts">
import type { DropdownOption } from './DropdownControl.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DropdownOptionIcon from './DropdownOptionIcon.vue'

interface Props {
  selectedOption: DropdownOption | null
  showBadge?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showBadge: true,
})

const { t } = useI18n()

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
    class="flex min-w-0 items-center text-left leading-tight gap-2"
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
    <span class="min-w-0 truncate">{{ selectedOption.label }}</span>
  </span>
  <span
    v-else
    class="text-base-content/50"
  >
    {{ t('common.select') }}
  </span>
</template>
