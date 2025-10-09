<script setup lang="ts">
import type { ProjectionDefinition, ProjectionRecommendation } from '@/projections/types'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import ProjectionConfirmDialog from '@/components/ui/ProjectionConfirmDialog.vue'
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
  loading?: boolean
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
  loading: false,
  recommendations: undefined,
  showRecommendations: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
}>()

const { t } = useI18n()

// Search/filter state
const searchQuery = ref('')
const isSearching = ref(false)

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
  if (!props.recommendations)
    return new Map()
  return new Map(
    props.recommendations.map(rec => [rec.projection.id, rec]),
  )
})

// Filter projection groups based on search query
const filteredProjectionGroups = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.projectionGroups
  }

  const query = searchQuery.value.toLowerCase().trim()

  return props.projectionGroups
    .map(group => ({
      ...group,
      options: group.options?.filter((option) => {
        // Search by label (translated)
        const label = t(option.label).toLowerCase()
        if (label.includes(query))
          return true

        // Search by projection ID
        if (option.value.toLowerCase().includes(query))
          return true

        // Search by category
        if (group.category.toLowerCase().includes(query))
          return true

        // Search by projection properties (if available)
        const projection = projectionRegistry.get(option.value)
        if (projection) {
          // Search by family
          if (projection.family.toLowerCase().includes(query))
            return true

          // Search by preservation properties
          if (projection.capabilities.preserves.some(prop => prop.toLowerCase().includes(query)))
            return true
        }

        return false
      }),
    }))
    .filter(group => group.options && group.options.length > 0)
})

// Toggle search mode
function toggleSearch() {
  isSearching.value = !isSearching.value
  if (!isSearching.value) {
    searchQuery.value = ''
  }
}

// Clear search
function clearSearch() {
  searchQuery.value = ''
}

// Get recommendation for a projection
function getRecommendation(projectionId: string): ProjectionRecommendation | undefined {
  return recommendationMap.value.get(projectionId)
}

// Get recommendation badge for display
function getRecommendationBadge(projectionId: string): string {
  const rec = getRecommendation(projectionId)
  if (!rec || !props.showRecommendations)
    return ''

  if (rec.level === 'excellent')
    return '⭐⭐⭐'
  if (rec.level === 'good')
    return '⭐⭐'
  if (rec.level === 'usable')
    return '⭐'
  return ''
}

// Get CSS class for recommendation level
function getRecommendationClass(projectionId: string): string {
  const rec = getRecommendation(projectionId)
  if (!rec || !props.showRecommendations)
    return ''

  if (rec.level === 'excellent')
    return 'text-success'
  if (rec.level === 'good')
    return 'text-info'
  if (rec.level === 'not-recommended')
    return 'text-error opacity-60'
  return ''
}

// Get recommendation tooltip
function getRecommendationTooltip(projectionId: string): string {
  const rec = getRecommendation(projectionId)
  if (!rec || !props.showRecommendations)
    return ''

  return t(rec.reason)
}

// Validation
const configStore = useConfigStore()
const { validateProjection, formatAlternatives } = useProjectionValidation()
const validationMessage = ref<string | null>(null)
const validationSeverity = ref<'error' | 'warning' | 'info'>('info')

// Confirmation dialog state
const confirmDialogProjection = ref<ProjectionDefinition | null>(null)
const confirmDialogMessage = ref('')
const confirmDialogAlternatives = ref<ProjectionDefinition[]>([])
const previousProjectionId = ref<string | undefined>(props.modelValue)

// Watch for projection changes and validate
watch(localValue, (newProjectionId, oldProjectionId) => {
  if (!newProjectionId || !props.recommendations) {
    validationMessage.value = null
    confirmDialogProjection.value = null
    return
  }

  const projection = projectionRegistry.get(newProjectionId)
  if (!projection) {
    validationMessage.value = null
    confirmDialogProjection.value = null
    return
  }

  previousProjectionId.value = oldProjectionId

  const result = validateProjection(projection, {
    atlasId: configStore.selectedAtlas,
    viewMode: configStore.viewMode,
    recommendations: props.recommendations,
  })

  // Show confirmation dialog for prohibited projections (errors)
  if (result.severity === 'error' && result.requiresConfirmation) {
    confirmDialogProjection.value = projection
    confirmDialogMessage.value = result.message
    confirmDialogAlternatives.value = result.alternatives || []
    validationMessage.value = null
  }
  // Show warning toast for poor/low suitability projections
  else if (result.severity === 'warning') {
    validationSeverity.value = result.severity
    let message = result.message
    if (result.alternatives && result.alternatives.length > 0) {
      message = `${message}. ${formatAlternatives(result.alternatives)}`
    }
    validationMessage.value = message
    confirmDialogProjection.value = null

    // Auto-hide warnings after 5 seconds
    setTimeout(() => {
      validationMessage.value = null
    }, 5000)
  }
  else {
    validationMessage.value = null
    confirmDialogProjection.value = null
  }
})

function closeValidationMessage() {
  validationMessage.value = null
}

function handleConfirmProhibited() {
  // User confirmed, keep the prohibited projection
  confirmDialogProjection.value = null
}

function handleCancelProhibited() {
  // User cancelled, revert to previous projection
  if (previousProjectionId.value) {
    emit('update:modelValue', previousProjectionId.value)
  }
  confirmDialogProjection.value = null
}
</script>

<template>
  <div class="form-control flex flex-col">
    <label class="label mb-1">
      <span class="label-text flex items-center gap-2">
        <i v-if="icon" :class="icon" />
        {{ label }}
      </span>
      <button
        type="button"
        class="btn btn-ghost btn-xs btn-circle"
        :aria-label="isSearching ? t('common.closeSearch') : t('common.search')"
        @click="toggleSearch"
      >
        <i :class="isSearching ? 'ri-close-line' : 'ri-search-line'" />
      </button>
    </label>

    <!-- Search input -->
    <Transition
      enter-active-class="transition-all duration-200"
      leave-active-class="transition-all duration-200"
      enter-from-class="opacity-0 -translate-y-2"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="isSearching" class="relative mb-2">
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('common.searchProjections')"
          class="input input-sm w-full pr-8"
          autofocus
        >
        <button
          v-if="searchQuery"
          type="button"
          class="btn btn-ghost btn-xs btn-circle absolute right-1 top-1/2 -translate-y-1/2"
          :aria-label="t('common.clear')"
          @click="clearSearch"
        >
          <i class="ri-close-line" />
        </button>
      </div>
    </Transition>

    <!-- Loading skeleton -->
    <div v-if="loading" class="skeleton h-12 w-full" />

    <select
      v-else
      v-model="localValue"
      class="select cursor-pointer"
      :disabled="disabled"
    >
      <optgroup
        v-for="group in filteredProjectionGroups"
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

    <!-- No results message -->
    <Transition
      enter-active-class="transition-all duration-200"
      leave-active-class="transition-all duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isSearching && searchQuery && filteredProjectionGroups.length === 0"
        class="label"
      >
        <span class="label-text-alt text-warning">
          {{ t('common.noProjectionsFound') }}
        </span>
      </div>
    </Transition>

    <!-- Recommendation hint for selected projection -->
    <Transition
      enter-active-class="transition-all duration-200"
      leave-active-class="transition-all duration-200"
      enter-from-class="opacity-0 -translate-y-1"
      leave-to-class="opacity-0 -translate-y-1"
    >
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
    </Transition>

    <!-- Validation warning toast -->
    <ToastNotification
      :message="validationMessage"
      :type="validationSeverity"
      position="top-end"
      @close="closeValidationMessage"
    />

    <!-- Confirmation dialog for prohibited projections -->
    <ProjectionConfirmDialog
      :projection="confirmDialogProjection"
      :message="confirmDialogMessage"
      :alternatives="confirmDialogAlternatives"
      @confirm="handleConfirmProhibited"
      @cancel="handleCancelProhibited"
    />
  </div>
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
