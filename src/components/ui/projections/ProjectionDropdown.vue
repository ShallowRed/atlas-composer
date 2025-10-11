<script setup lang="ts">
import type { ProjectionRecommendation } from '@/core/projections/types'

import { toRef } from 'vue'
import { useI18n } from 'vue-i18n'
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
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  recommendations: undefined,
  showRecommendations: true,
  disabled: false,
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useI18n()

// Import recommendation helpers
const { getBadge, getCssClass, getTooltip } = useProjectionRecommendations(
  toRef(props, 'recommendations'),
)
</script>

<template>
  <!-- Loading skeleton -->
  <div
    v-if="loading"
    class="skeleton h-12 w-full"
  />

  <!-- Dropdown -->
  <select
    v-else
    :value="modelValue"
    class="select cursor-pointer border bg-base-200/30"
    :disabled="disabled"
    @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <optgroup
      v-for="group in projectionGroups"
      :key="group.category"
      :label="group.category"
    >
      <option
        v-for="option in group.options"
        :key="option.value"
        :value="option.value"
        :class="getCssClass(option.value)"
        :title="getTooltip(option.value)"
      >
        {{ t(option.label) }}{{ showRecommendations && getBadge(option.value) ? ` ${getBadge(option.value)}` : '' }}
      </option>
    </optgroup>
  </select>
</template>

<style scoped>
.select {
  transition: all 0.2s ease;
}

.select:focus {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.select:hover:not(:disabled) {
  opacity: 0.9;
}

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

/* Enhance recommendation badges visibility */
.text-success {
  font-weight: 600;
}

.text-info {
  font-weight: 500;
}

.text-error {
  font-style: italic;
}
</style>
