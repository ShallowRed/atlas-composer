<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUrlState } from '@/composables/useUrlState'

const { t } = useI18n()
const { copyShareableUrl } = useUrlState()

const copied = ref(false)
const error = ref(false)
let timeoutId: number | undefined

const label = computed(() => t(copied.value ? 'share.copied' : error.value ? 'share.error' : 'share.button'))

async function handleCopy() {
  const success = await copyShareableUrl()

  if (success) {
    copied.value = true
    error.value = false

    if (timeoutId)
      clearTimeout(timeoutId)
    timeoutId = window.setTimeout(() => {
      copied.value = false
    }, 2000)
  }
  else {
    error.value = true
    copied.value = false

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
    <span class="max-lg:sr-only">{{ label }}</span>
  </button>
</template>
