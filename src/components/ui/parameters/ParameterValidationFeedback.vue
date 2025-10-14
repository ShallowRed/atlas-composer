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
      <div class="alert alert-error">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="stroke-current flex-shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
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
      <div class="alert alert-warning">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="stroke-current flex-shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
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
