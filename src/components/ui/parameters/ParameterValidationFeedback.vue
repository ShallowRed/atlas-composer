<script setup lang="ts">
import type { ParameterIssue } from '@/core/types/errors'

import { useI18n } from 'vue-i18n'
import { useErrorMessage } from '@/composables/useErrorMessage'

defineProps<{
  issues: ParameterIssue[]
}>()

const { t } = useI18n()
const { parameterIssueMessage } = useErrorMessage()
</script>

<template>
  <div class="parameter-validation-feedback mb-3">
    <div class="alert alert-error alert-soft">
      <i class="ri-error-warning-line text-2xl" />
      <div>
        <h3 class="font-bold">
          {{ t('validation.errors.title') }}
        </h3>
        <ul class="list-disc list-inside mt-1">
          <li
            v-for="issue in issues"
            :key="`${issue.code}-${issue.parameter}`"
            class="text-sm"
          >
            {{ parameterIssueMessage(issue) }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
