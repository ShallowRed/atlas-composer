<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col items-start gap-4">
    <h1 class="text-3xl font-bold">
      {{ t('notFound.title') }}
    </h1>
    <p class="text-lg text-base-content/80">
      {{ t('notFound.description') }}
    </p>
    <RouterLink
      to="/"
      class="btn btn-primary"
    >
      {{ t('nav.openApp') }}
      <i class="ri-arrow-right-line" />
    </RouterLink>
  </div>
</template>
