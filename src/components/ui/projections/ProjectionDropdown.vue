<script setup lang="ts">
import type { ProjectionRecommendation } from '@/core/projections/types'

import { computed, toRef } from 'vue'
import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import { useProjectionRecommendations } from '@/composables/useProjectionRecommendations'

interface ProjectionOption {
  value: string
  label: string
  category?: string
}

interface ProjectionGroup {
  category: string
  options?: ProjectionOption[]
}

interface Props {
  modelValue?: string
  projectionGroups: ProjectionGroup[]
  recommendations?: ProjectionRecommendation[]
  showRecommendations?: boolean
  disabled?: boolean
  loading?: boolean
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  recommendations: undefined,
  showRecommendations: true,
  disabled: false,
  loading: false,
  label: 'Projection',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Import recommendation helpers
const { getBadge } = useProjectionRecommendations(
  toRef(props, 'recommendations'),
)

// Transform projection groups to include badges
const projectionGroupsWithBadges = computed(() => {
  return props.projectionGroups.map(group => ({
    ...group,
    options: group.options?.map(option => ({
      ...option,
      badge: props.showRecommendations ? getBadge(option.value) : undefined,
    })),
  }))
})
</script>

<template>
  <!-- Loading skeleton -->
  <div
    v-if="loading"
    class="skeleton h-12 w-full"
  />

  <!-- Dropdown -->
  <DropdownControl
    v-else
    :model-value="modelValue"
    :label="label"
    icon="ri-global-line"
    :disabled="disabled"
    :option-groups="projectionGroupsWithBadges"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<style scoped>
/* Loading skeleton animation */
.skeleton {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
