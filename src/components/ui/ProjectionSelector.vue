<script setup lang="ts">
import type { ProjectionDefinition, ProjectionRecommendation } from '@/core/projections/types'

import { computed, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import ProjectionConfirmDialog from '@/components/ui/ProjectionConfirmDialog.vue'
import ProjectionInfo from '@/components/ui/ProjectionInfo.vue'
import ProjectionDropdown from '@/components/ui/projections/ProjectionDropdown.vue'
import ProjectionRecommendationBadge from '@/components/ui/projections/ProjectionRecommendationBadge.vue'
import ProjectionSearchBar from '@/components/ui/projections/ProjectionSearchBar.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import { useProjectionFiltering } from '@/composables/useProjectionFiltering'
import { useProjectionRecommendations } from '@/composables/useProjectionRecommendations'
import { useProjectionValidation } from '@/composables/useProjectionValidation'
import { projectionRegistry } from '@/core/projections/registry'
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
  icon: 'ri-global-line',
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

// Use filtering composable
const {
  searchQuery,
  isSearching,
  filteredProjectionGroups,
  toggleSearch,
  clearSearch,
} = useProjectionFiltering(toRef(props, 'projectionGroups'))

// Use recommendations composable
const { getRecommendation } = useProjectionRecommendations(
  toRef(props, 'recommendations'),
)

// Projection info modal state
const showInfoModal = ref(false)
const infoProjection = ref<ProjectionDefinition | null>(null)

const localValue = computed({
  get: () => props.modelValue,
  set: (value: string | undefined) => {
    if (value !== undefined) {
      emit('update:modelValue', value)
      emit('change', value)
    }
  },
})

// Show projection info modal
function showProjectionInfo() {
  if (localValue.value) {
    const projection = projectionRegistry.get(localValue.value)
    if (projection) {
      infoProjection.value = projection
      showInfoModal.value = true
    }
  }
}

// Close projection info modal
function closeInfoModal() {
  showInfoModal.value = false
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
  <fieldset class="form-control fieldset flex flex-col">
    <legend class="fieldset-legend text-sm flex items-center justify-between w-full">
      <span class="flex items-center gap-2">
        <i v-if="icon" :class="icon" />
        {{ label }}
      </span>
      <div class="flex items-center gap-1 ml-auto">
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-circle"
          :aria-label="t('common.showProjectionInformation')"
          :disabled="!modelValue"
          @click="showProjectionInfo"
        >
          <i class="text-base ri-information-line" />
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-circle"
          :aria-label="isSearching ? t('common.closeSearch') : t('common.search')"
          @click="toggleSearch"
        >
          <i class="text-base" :class="[isSearching ? 'ri-close-line' : 'ri-search-line']" />
        </button>
      </div>
    </legend>

    <!-- Search Bar Component -->
    <ProjectionSearchBar
      v-model="searchQuery"
      v-model:is-searching="isSearching"
      :placeholder="t('common.searchProjections')"
      @clear="clearSearch"
    />

    <!-- Dropdown Component -->
    <ProjectionDropdown
      v-model="localValue"
      :projection-groups="filteredProjectionGroups"
      :recommendations="recommendations"
      :show-recommendations="showRecommendations"
      :disabled="disabled"
      :loading="loading"
    />

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
    <div
      v-if="showRecommendations && modelValue && getRecommendation(modelValue)"
      class="label mt-3"
    >
      <span class="label-text-alt flex items-center gap-2">
        <ProjectionRecommendationBadge
          :projection-id="modelValue"
          :recommendations="recommendations || []"
          :show-tooltip="false"
        />
        <span class="opacity-70">
          {{ getRecommendation(modelValue)?.reason ? t(getRecommendation(modelValue)!.reason) : '' }}
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

    <!-- Confirmation dialog for prohibited projections -->
    <ProjectionConfirmDialog
      :projection="confirmDialogProjection"
      :message="confirmDialogMessage"
      :alternatives="confirmDialogAlternatives"
      @confirm="handleConfirmProhibited"
      @cancel="handleCancelProhibited"
    />

    <!-- Projection info modal -->
    <dialog :id="`projection-info-modal-${label}`" class="modal" :class="{ 'modal-open': showInfoModal }">
      <div class="modal-box max-w-4xl">
        <h3 class="font-bold text-lg mb-4">
          {{ t('common.projectionInformation') }}
        </h3>
        <ProjectionInfo
          v-if="infoProjection"
          :projection="infoProjection"
          :show-metadata="true"
        />
        <div class="modal-action">
          <button class="btn" @click="closeInfoModal">
            {{ t('common.close') }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="closeInfoModal">
        <button>close</button>
      </form>
    </dialog>
  </fieldset>
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
