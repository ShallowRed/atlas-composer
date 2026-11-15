<script setup lang="ts">
import type { ExampleSource } from '@/core/examples'
import { useI18n } from 'vue-i18n'

defineProps<{ sources: ExampleSource[] }>()

const { t } = useI18n()
</script>

<template>
  <p class="text-xs text-base-content/70">
    {{ t('examples.sources') }}
    <template
      v-for="(source, index) in sources"
      :key="source.url"
    >
      <span v-if="index > 0"> · </span>
      <a
        :href="source.url"
        target="_blank"
        rel="noopener noreferrer"
        class="link"
      >{{ source.label }}</a>
    </template>
  </p>
</template>
