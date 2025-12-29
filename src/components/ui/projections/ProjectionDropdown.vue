<script setup lang="ts">
import type { ProjectionDefinition, ProjectionRecommendation } from '@/core/projections/types'
import type { ProjectionId } from '@/types/branded'

import { computed, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'

import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import Modal from '@/components/ui/primitives/Modal.vue'
import ProjectionInfo from '@/components/ui/projections/ProjectionInfo.vue'
import { useProjectionRecommendations } from '@/composables/useProjectionRecommendations'
import { projectionRegistry } from '@/core/projections/registry'

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
  label: string
  modelValue?: ProjectionId | null
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
  'update:modelValue': [value: ProjectionId]
  'change': [value: ProjectionId]
}>()

const { t } = useI18n()

// Import recommendation helpers
const { getBadge, getCssClass } = useProjectionRecommendations(
  toRef(props, 'recommendations'),
)

// Projection info modal state
const showInfoModal = ref(false)
const infoProjection = ref<ProjectionDefinition | null>(null)

// Transform projection groups to include badges with styling
const projectionGroupsWithBadges = computed(() => {
  return props.projectionGroups.map(group => ({
    ...group,
    options: group.options?.map((option) => {
      // Convert: option.value is string from registry, cast to ProjectionId for recommendation lookup
      const badge = props.showRecommendations ? getBadge(option.value as ProjectionId) : undefined
      const cssClass = badge ? getCssClass(option.value as ProjectionId) : undefined

      // Combine badge icon with CSS class if both exist
      const badgeWithClass = badge && cssClass ? `${badge} ${cssClass}` : badge

      return {
        ...option,
        badge: badgeWithClass,
      }
    }),
  }))
})

// Show projection info modal
function showProjectionInfo() {
  if (props.modelValue) {
    const projection = projectionRegistry.get(props.modelValue)
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

// Convert: v-model from dropdown gives string, convert to ProjectionId at boundary
function handleUpdate(value: string) {
  emit('update:modelValue', value as ProjectionId)
  emit('change', value as ProjectionId)
}
</script>

<template>
  <div class="relative">
    <!-- Loading skeleton -->
    <div
      v-if="loading"
      class="skeleton h-12 w-full"
    />

    <!-- Dropdown -->
    <DropdownControl
      v-else
      :model-value="modelValue as string"
      :label="label"
      icon="ri-global-line"
      :disabled="disabled"
      :option-groups="projectionGroupsWithBadges"
      @update:model-value="handleUpdate"
    />

    <!-- Info button -->
    <button
      v-if="!loading"
      type="button"
      class="btn btn-ghost btn-xs btn-circle absolute top-0 right-1"
      :aria-label="t('common.showProjectionInformation')"
      :disabled="!modelValue"
      @click="showProjectionInfo"
    >
      <i class="text-base ri-information-line" />
    </button>

    <!-- Projection info modal -->
    <Modal
      v-model="showInfoModal"
      icon="ri-information-line"
      :title="t('common.projectionInformation')"
      max-width="2xl"
    >
      <ProjectionInfo
        v-if="infoProjection"
        :projection="infoProjection"
        :show-metadata="true"
      />

      <template #actions>
        <button
          class="btn btn-soft btn-primary"
          @click="closeInfoModal"
        >
          {{ t('common.close') }}
        </button>
      </template>
    </Modal>
  </div>
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
