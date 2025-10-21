<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUrlState } from '@/composables/useUrlState'

const { t } = useI18n()
const { copyShareableUrl } = useUrlState()

const copied = ref(false)
const error = ref(false)
let timeoutId: number | undefined

async function handleCopy() {
  const success = await copyShareableUrl()

  if (success) {
    copied.value = true
    error.value = false

    // Reset after 2 seconds
    if (timeoutId)
      clearTimeout(timeoutId)
    timeoutId = window.setTimeout(() => {
      copied.value = false
    }, 2000)
  }
  else {
    error.value = true
    copied.value = false

    // Reset error after 3 seconds
    if (timeoutId)
      clearTimeout(timeoutId)
    timeoutId = window.setTimeout(() => {
      error.value = false
    }, 3000)
  }
}
</script>

<template>
  <button
    class="btn btn-ghost btn-sm gap-2"
    :class="{
      'btn-success btn-soft': copied,
      'btn-error btn-soft': error,
    }"
    @click="handleCopy"
  >
    <i
      v-if="!copied && !error"
      class="ri-share-line"
    />
    <i
      v-else-if="copied"
      class="ri-check-line"
    />
    <i
      v-else
      class="ri-error-warning-line"
    />
    <span v-if="!copied && !error">{{ t('share.button') }}</span>
    <span v-else-if="copied">{{ t('share.copied') }}</span>
    <span v-else>{{ t('share.error') }}</span>
  </button>
</template>
