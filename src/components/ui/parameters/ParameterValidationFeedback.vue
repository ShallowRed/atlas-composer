<script setup lang="ts">
import type { ParameterValidationResult } from '@/types/projection-parameters'

import { useI18n } from 'vue-i18n'

interface Props {
  errors: ParameterValidationResult[]
  warnings: ParameterValidationResult[]
}

defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <div class="parameter-validation-feedback">
    <!-- Validation Errors -->
    <div
      v-if="errors.length > 0"
      class="validation-errors mb-3"
    >
      <div class="alert alert-error alert-soft">
        <i class="ri-error-warning-line text-2xl" />
        <div>
          <h3 class="font-bold">
            {{ t('validation.errors.title') }}
          </h3>
          <ul class="list-disc list-inside mt-1">
            <li
              v-for="error in errors"
              :key="error.error"
              class="text-sm"
            >
              {{ error.error }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Validation Warnings -->
    <div
      v-if="warnings.length > 0"
      class="validation-warnings"
    >
      <div class="alert alert-warning alert-soft">
        <i class="ri-error-warning-line text-2xl" />
        <div>
          <h3 class="font-bold">
            {{ t('validation.warnings.title') }}
          </h3>
          <ul class="list-disc list-inside mt-1">
            <li
              v-for="warning in warnings"
              :key="warning.warning"
              class="text-sm"
            >
              {{ warning.warning }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
