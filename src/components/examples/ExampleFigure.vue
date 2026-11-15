<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Alert from '@/components/ui/primitives/Alert.vue'

defineProps<{ errorMessage: string | null, loading: boolean }>()

const { t } = useI18n()
</script>

<template>
  <figure class="relative flex flex-col gap-3">
    <slot name="controls" />
    <Alert
      v-if="errorMessage"
      type="error"
      size="sm"
      role="alert"
    >
      {{ errorMessage }}
    </Alert>
    <div
      v-else-if="loading"
      class="aspect-[3/2] rounded-box border border-base-300 bg-base-100"
      :aria-label="t('actions.loading')"
    />
    <slot
      v-else
      name="map"
    />
    <slot />
  </figure>
</template>
