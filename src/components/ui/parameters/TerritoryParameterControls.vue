<!--
  Territory Parameter Controls

  Component for editing projection parameters specific to a territory
  in custom composite mode. Provides full parameter controls with
  inheritance indicators and validation feedback.
-->
<script setup lang="ts">
import type { ProjectionFamilyType } from '@/core/projections/types'
import type {
  BaseProjectionParameters,
} from '@/types/projection-parameters'

import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

import ParameterControlGroup from '@/components/ui/parameters/ParameterControlGroup.vue'
import ParameterValidationFeedback from '@/components/ui/parameters/ParameterValidationFeedback.vue'
import Alert from '@/components/ui/primitives/Alert.vue'
import { useParameterStore } from '@/stores/parameters'

interface Props {
  /** Territory code for parameter management */
  territoryCode: string
  /** Territory display name */
  territoryName: string
  /** Projection family for parameter validation and constraints */
  projectionFamily: ProjectionFamilyType
  /** Whether to show parameter inheritance indicators */
  showInheritanceIndicators?: boolean
  /** Whether to allow parameter overrides at territory level */
  allowParameterOverrides?: boolean
  /** Whether to show validation feedback */
  showValidationFeedback?: boolean
}

interface Emits {
  (e: 'parameterChanged', territoryCode: string, key: keyof BaseProjectionParameters, value: unknown): void
  (e: 'overrideCleared', territoryCode: string, key: keyof BaseProjectionParameters): void
}

const props = withDefaults(defineProps<Props>(), {
  showInheritanceIndicators: true,
  allowParameterOverrides: true,
  showValidationFeedback: true,
})

const emit = defineEmits<Emits>()
const { t } = useI18n()
const parameterStore = useParameterStore()

// Get parameter constraints for this projection family
const parameterConstraints = computed(() => {
  return parameterStore.getParameterConstraints(props.projectionFamily)
})

// Get current effective parameters for this territory
const effectiveParameters = computed(() => {
  return parameterStore.getEffectiveParameters(props.territoryCode)
})

// Get territory-specific parameter overrides
const territoryParameters = computed(() => {
  return parameterStore.getTerritoryParameters(props.territoryCode)
})

// Get validation results for current parameters
const validationResults = computed(() => {
  return parameterStore.validateTerritoryParameters(props.territoryCode, props.projectionFamily)
})

// Check if territory has any parameter overrides
const hasOverrides = computed(() => {
  return Object.keys(territoryParameters.value).length > 0
})

// Get list of relevant parameters for this projection family
const relevantParameters = computed(() => {
  return Object.entries(parameterConstraints.value.constraints)
    .filter(([, constraint]) => constraint.relevant)
    .map(([key]) => key as keyof BaseProjectionParameters)
})

// Get validation errors for display
const validationErrors = computed(() => {
  return validationResults.value.filter(result => !result.isValid)
})

const validationWarnings = computed(() => {
  return validationResults.value.filter(result => result.isValid && result.warning)
})

// Handle parameter value changes
function handleParameterChange(key: keyof BaseProjectionParameters, value: unknown) {
  // Validate the parameter before setting
  const validationResult = parameterStore.validateParameter(props.projectionFamily, key, value)

  if (validationResult.isValid || props.allowParameterOverrides) {
    // Set the parameter value
    parameterStore.setTerritoryParameter(props.territoryCode, key, value)

    // Emit change event
    emit('parameterChanged', props.territoryCode, key, value)
  }
}

// Clear all parameter overrides for this territory
function clearAllOverrides() {
  parameterStore.clearAllTerritoryOverrides(props.territoryCode)

  // Emit cleared events for all overridden parameters
  Object.keys(territoryParameters.value).forEach((key) => {
    emit('overrideCleared', props.territoryCode, key as keyof BaseProjectionParameters)
  })
}

// Lifecycle hooks for validation
onMounted(() => {
  // Trigger initial validation
  parameterStore.validateTerritoryParameters(props.territoryCode, props.projectionFamily)
})

onUnmounted(() => {
  // Clean up validation errors for this territory
  // This would be handled by the store's internal cleanup
})
</script>

<template>
  <div class="territory-parameter-controls">
    <!-- Header with territory name and reset button -->
    <div class="flex items-center justify-between mb-4">
      <h4 class="text-lg font-semibold">
        {{ territoryName }}
      </h4>

      <button
        v-if="hasOverrides"
        class="btn btn-sm btn-ghost"
        :title="t('territory.parameters.resetOverrides')"
        @click="clearAllOverrides"
      >
        <i class="ri-restart-line" />
        {{ t('territory.parameters.reset') }}
      </button>
    </div>

    <!-- Validation feedback -->
    <div
      v-if="showValidationFeedback && (validationErrors.length > 0 || validationWarnings.length > 0)"
      class="mb-4"
    >
      <ParameterValidationFeedback
        :errors="validationErrors"
        :warnings="validationWarnings"
        :territory-code="territoryCode"
      />
    </div>

    <!-- Parameter controls grouped by type -->
    <div class="space-y-6">
      <!-- Position Parameters (Center/Rotation) -->
      <div v-if="relevantParameters.some(p => ['center', 'rotate'].includes(p))">
        <h5 class="text-sm font-medium mb-3 text-base-content/70">
          <i class="ri-compass-3-line mr-1" />
          {{ t('territory.parameters.position') }}
        </h5>

        <div class="space-y-4">
          <!-- Center Controls (for conic projections) -->
          <!-- Center Controls (for conic projections) -->
          <template v-if="relevantParameters.includes('center')">
            <ParameterControlGroup
              :title="t('parameters.center.title')"
              :description="t('parameters.center.description')"
            >
              <!-- Center parameter control would go here -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text">{{ t('parameters.center.label') }}</span>
                </label>
                <input
                  type="text"
                  class="input input-bordered"
                  :value="effectiveParameters.center?.join(', ')"
                  @input="(e) => {
                    const target = e.target as HTMLInputElement
                    const values = target.value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
                    if (values.length === 2) handleParameterChange('center', values)
                  }"
                >
              </div>
            </ParameterControlGroup>
          </template>

          <!-- Rotate Controls -->
          <template v-if="relevantParameters.includes('rotate')">
            <ParameterControlGroup
              :title="t('parameters.rotate.title')"
              :description="t('parameters.rotate.description')"
            >
              <div class="form-control">
                <label class="label">
                  <span class="label-text">{{ t('parameters.rotate.label') }}</span>
                </label>
                <input
                  type="text"
                  class="input input-bordered"
                  :value="effectiveParameters.rotate?.join(', ')"
                  @input="(e) => {
                    const target = e.target as HTMLInputElement
                    const values = target.value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
                    if (values.length >= 2) handleParameterChange('rotate', values)
                  }"
                >
              </div>
            </ParameterControlGroup>
          </template>
        </div>
      </div>

      <!-- Projection-Specific Parameters -->
      <div v-if="relevantParameters.includes('parallels')">
        <h5 class="text-sm font-medium mb-3 text-base-content/70">
          <i class="ri-equalizer-line mr-1" />
          {{ t('territory.parameters.projectionSpecific') }}
        </h5>

        <div class="space-y-4">
          <!-- Parallels (for conic projections) -->
          <ParameterControlGroup
            :title="t('parameters.parallels.title')"
            :description="t('parameters.parallels.description')"
          >
            <div class="form-control">
              <label class="label">
                <span class="label-text">{{ t('parameters.parallels.label') }}</span>
              </label>
              <input
                type="text"
                class="input input-bordered"
                :value="effectiveParameters.parallels?.join(', ')"
                @input="(e) => {
                  const target = e.target as HTMLInputElement
                  const values = target.value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
                  if (values.length === 2) handleParameterChange('parallels', values)
                }"
              >
            </div>
          </ParameterControlGroup>
          @override-cleared="() => handleOverrideCleared('parallels')"
          />
        </div>
      </div>

      <!-- View Parameters -->
      <div v-if="relevantParameters.some(p => ['scale', 'clipAngle'].includes(p))">
        <h5 class="text-sm font-medium mb-3 text-base-content/70">
          <i class="ri-zoom-in-line mr-1" />
          {{ t('territory.parameters.view') }}
        </h5>

        <div class="space-y-4">
          <!-- Scale Control -->
          <template v-if="relevantParameters.includes('scale')">
            <ParameterControlGroup
              :title="t('parameters.scale.title')"
              :description="t('parameters.scale.description')"
            >
              <div class="form-control">
                <label class="label">
                  <span class="label-text">{{ t('parameters.scale.label') }}</span>
                </label>
                <input
                  type="number"
                  class="input input-bordered"
                  :value="effectiveParameters.scale"
                  @input="(e) => {
                    const target = e.target as HTMLInputElement
                    const value = parseFloat(target.value)
                    if (!isNaN(value)) handleParameterChange('scale', value)
                  }"
                >
              </div>
            </ParameterControlGroup>
          </template>

          <!-- Clip Angle (for azimuthal projections) -->
          <template v-if="relevantParameters.includes('clipAngle')">
            <ParameterControlGroup
              :title="t('parameters.clipAngle.title')"
              :description="t('parameters.clipAngle.description')"
            >
              <div class="form-control">
                <label class="label">
                  <span class="label-text">{{ t('parameters.clipAngle.label') }}</span>
                </label>
                <input
                  type="number"
                  class="input input-bordered"
                  :value="effectiveParameters.clipAngle"
                  @input="(e) => {
                    const target = e.target as HTMLInputElement
                    const value = parseFloat(target.value)
                    if (!isNaN(value)) handleParameterChange('clipAngle', value)
                  }"
                >
              </div>
            </ParameterControlGroup>
          </template>
        </div>
      </div>

      <!-- Advanced Parameters -->
      <div v-if="relevantParameters.some(p => ['precision', 'translate'].includes(p))">
        <details class="collapse collapse-arrow">
          <summary class="collapse-title text-sm font-medium">
            <i class="ri-settings-3-line mr-1" />
            {{ t('territory.parameters.advanced') }}
          </summary>

          <div class="collapse-content space-y-4">
            <!-- Precision Control -->
            <template v-if="relevantParameters.includes('precision')">
              <ParameterControlGroup
                :title="t('parameters.precision.title')"
                :description="t('parameters.precision.description')"
              >
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">{{ t('parameters.precision.label') }}</span>
                  </label>
                  <input
                    type="number"
                    class="input input-bordered"
                    :value="effectiveParameters.precision"
                    @input="(e) => {
                      const target = e.target as HTMLInputElement
                      const value = parseFloat(target.value)
                      if (!isNaN(value)) handleParameterChange('precision', value)
                    }"
                  >
                </div>
              </ParameterControlGroup>
            </template>

            <!-- Translate Control -->
            <template v-if="relevantParameters.includes('translate')">
              <ParameterControlGroup
                :title="t('parameters.translate.title')"
                :description="t('parameters.translate.description')"
              >
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">{{ t('parameters.translate.label') }}</span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered"
                    :value="effectiveParameters.translate?.join(', ')"
                    @input="(e) => {
                      const target = e.target as HTMLInputElement
                      const values = target.value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
                      if (values.length === 2) handleParameterChange('translate', values)
                    }"
                  >
                </div>
              </ParameterControlGroup>
            </template>
          </div>
        </details>
      </div>
    </div>

    <!-- No relevant parameters message -->
    <Alert
      v-if="relevantParameters.length === 0"
      type="info"
      :title="t('territory.parameters.noRelevantParameters')"
      :message="t('territory.parameters.noRelevantParametersMessage', { family: projectionFamily })"
    />
  </div>
</template>
