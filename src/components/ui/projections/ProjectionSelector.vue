<script setup lang="ts">
import type { ProjectionDefinition, ProjectionRecommendation } from '@/core/projections/types'

import { computed, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import ProjectionDropdown from '@/components/ui/projections/ProjectionDropdown.vue'
import ProjectionInfo from '@/components/ui/projections/ProjectionInfo.vue'
import { useProjectionFiltering } from '@/composables/useProjectionFiltering'
import { projectionRegistry } from '@/core/projections/registry'

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
  filteredProjectionGroups,
} = useProjectionFiltering(toRef(props, 'projectionGroups'))

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
const validationMessage = ref<string | null>(null)

// Confirmation dialog state
const confirmDialogProjection = ref<ProjectionDefinition | null>(null)
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
})
</script>

<template>
  <div class="relative">
    <ProjectionDropdown
      v-model="localValue"
      :projection-groups="filteredProjectionGroups"
      :recommendations="recommendations"
      :show-recommendations="showRecommendations"
      :disabled="disabled"
      :loading="loading"
    />
    <button
      type="button"
      class="btn btn-ghost btn-xs btn-circle absolute top-1 right-1"
      :aria-label="t('common.showProjectionInformation')"
      :disabled="!modelValue"
      @click="showProjectionInfo"
    >
      <i class="text-base ri-information-line" />
    </button>
  </div>
  <!-- Projection info modal -->
  <dialog
    :id="`projection-info-modal-${label}`"
    class="modal"
    :class="{ 'modal-open': showInfoModal }"
  >
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
        <button
          class="btn"
          @click="closeInfoModal"
        >
          {{ t('common.close') }}
        </button>
      </div>
    </div>
    <form
      method="dialog"
      class="modal-backdrop"
      @click="closeInfoModal"
    >
      <button>close</button>
    </form>
  </dialog>
</template>
