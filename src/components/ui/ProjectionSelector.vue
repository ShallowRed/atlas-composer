<script setup lang="ts">
import type { ProjectionRecommendation } from '@/projections/types'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import ToastNotification from '@/components/ui/ToastNotification.vue'
import { useProjectionValidation } from '@/composables/useProjectionValidation'
import { projectionRegistry } from '@/projections/registry'
import { useConfigStore } from '@/stores/config'

interface ProjectionOption {
  value: string
  label: string
  category?: string
}

interface Props {
  label: string
  icon?: string
  modelValue?: string
  disabled?: boolean
  projectionGroups: Array<{
    category: string
    options?: ProjectionOption[]
  }>
  recommendations?: ProjectionRecommendation[]
  showRecommendations?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'ri-map-2-line',
  modelValue: undefined,
  disabled: false,
  recommendations: undefined,
  showRecommendations: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
}>()

const { t } = useI18n()

const localValue = computed({
  get: () => props.modelValue,
  set: (value: string | undefined) => {
    if (value !== undefined) {
      emit('update:modelValue', value)
      emit('change', value)
    }
  },
})

// Create a map of projection IDs to their recommendations
const recommendationMap = computed(() => {
  if (!props.recommendations) return new Map()
  return new Map(
    props.recommendations.map(rec => [rec.projection.id, rec]),
  )
})

// Get recommendation for a projection
function getRecommendation(projectionId: string): ProjectionRecommendation | undefined {
  return recommendationMap.value.get(projectionId)
}

// Get recommendation badge for display
function getRecommendationBadge(projectionId: string): string {
  const rec = getRecommendation(projectionId)
  if (!rec || !props.showRecommendations) return ''
  
  if (rec.level === 'excellent') return '⭐⭐⭐'
  if (rec.level === 'good') return '⭐⭐'
  if (rec.level === 'usable') return '⭐'
  return ''
}

// Get CSS class for recommendation level
function getRecommendationClass(projectionId: string): string {
  const rec = getRecommendation(projectionId)
  if (!rec || !props.showRecommendations) return ''
  
  if (rec.level === 'excellent') return 'text-success'
  if (rec.level === 'good') return 'text-info'
  if (rec.level === 'not-recommended') return 'text-error opacity-60'
  return ''
}

// Get recommendation tooltip
function getRecommendationTooltip(projectionId: string): string {
  const rec = getRecommendation(projectionId)
  if (!rec || !props.showRecommendations) return ''
  
  return t(rec.reason)
}

// Validation
const configStore = useConfigStore()
const { validateProjection, formatAlternatives } = useProjectionValidation()
const validationMessage = ref<string | null>(null)
const validationSeverity = ref<'error' | 'warning' | 'info'>('info')

// Watch for projection changes and validate
watch(localValue, (newProjectionId) => {
  if (!newProjectionId || !props.recommendations) {
    validationMessage.value = null
    return
  }

  const projection = projectionRegistry.get(newProjectionId)
  if (!projection) {
    validationMessage.value = null
    return
  }

  const result = validateProjection(projection, {
    atlasId: configStore.selectedAtlas,
    viewMode: configStore.viewMode,
    recommendations: props.recommendations,
  })

  if (result.severity === 'error' || result.severity === 'warning') {
    validationSeverity.value = result.severity
    let message = result.message
    if (result.alternatives && result.alternatives.length > 0) {
      message = `${message}. ${formatAlternatives(result.alternatives)}`
    }
    validationMessage.value = message
    
    // Auto-hide warnings after 5 seconds
    if (result.severity === 'warning') {
      setTimeout(() => {
        validationMessage.value = null
      }, 5000)
    }
  }
  else {
    validationMessage.value = null
  }
})

function closeValidationMessage() {
  validationMessage.value = null
}
</script>

<template>
  <div class="form-control flex flex-col">
    <label class="label mb-1">
      <span class="label-text flex items-center gap-2">
        <i v-if="icon" :class="icon" />
        {{ label }}
      </span>
    </label>
    
    <select
      v-model="localValue"
      class="select cursor-pointer"
      :disabled="disabled"
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
          :class="getRecommendationClass(option.value)"
          :title="getRecommendationTooltip(option.value)"
        >
          {{ $t(option.label) }}{{ showRecommendations && getRecommendationBadge(option.value) ? ` ${getRecommendationBadge(option.value)}` : '' }}
        </option>
      </optgroup>
    </select>
    
    <!-- Recommendation hint for selected projection -->
    <div
      v-if="showRecommendations && modelValue && getRecommendation(modelValue)"
      class="label"
    >
      <span class="label-text-alt flex items-center gap-1">
        <span :class="getRecommendationClass(modelValue)">
          {{ getRecommendationBadge(modelValue) }}
        </span>
        <span class="opacity-70">
          {{ getRecommendationTooltip(modelValue) }}
        </span>
      </span>
    </div>

    <!-- Validation warning toast -->
    <ToastNotification
      :message="validationMessage"
      :type="validationSeverity"
      position="top-end"
      @close="closeValidationMessage"
    />
  </div>
</template>
