<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import CardContainer from '@/components/ui/primitives/CardContainer.vue'

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Introduction -->
    <!-- <CardContainer
      :title="t('about.pageTitle')"
      icon="ri-map-2-line"
    >
      <div class="prose max-w-none">
        <p class="text-xl">
          {{ t('about.intro') }}
        </p>
      </div>
    </CardContainer> -->
    <div class="hero">
      <div class="hero-content text-center">
        <div class="max-w-2xl">
          <h1 class="text-4xl font-bold mb-4">
            {{ t('about.title') }}
          </h1>
          <p class="text-lg">
            {{ t('about.intro') }}
          </p>
        </div>
      </div>
    </div>
    <div class="grid gap-6 md:grid-cols-3">
      <!-- Why this tool -->
      <CardContainer
        :title="t('about.why.title')"
        icon="ri-lightbulb-line"
      >
        <div class="prose max-w-none text-lg">
          <p>
            {{ t('about.why.description') }}
          </p>
        </div>
      </CardContainer>

      <!-- Features -->
      <CardContainer
        :title="t('about.features.title')"
        icon="ri-list-check"
      >
        <div class="prose max-w-none">
          <ul class="list-disc pl-6 space-y-2 text-lg">
            <li>{{ t('about.features.compositeExisting') }}</li>
            <li>{{ t('about.features.compositeCustom') }}</li>
            <li>{{ t('about.features.split') }}</li>
            <li>{{ t('about.features.unified') }}</li>
          </ul>
        </div>
      </CardContainer>

      <!-- Atlases -->
      <CardContainer
        :title="t('about.atlases.title')"
        icon="ri-global-line"
      >
        <div class="prose max-w-none text-lg">
          <ul class="list-disc pl-6 space-y-2">
            <li>{{ t('about.atlases.france') }}</li>
            <li>{{ t('about.atlases.portugal') }}</li>
            <li>{{ t('about.atlases.eu') }}</li>
          </ul>
        </div>
      </CardContainer>
    </div>

    <!-- CTA -->
    <div class="text-center py-6">
      <RouterLink
        to="/"
        class="btn btn-primary btn-lg"
      >
        <i class="ri-flask-line" />
        {{ t('about.cta') }}
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.prose {
  color: oklch(var(--bc));
}

.prose strong {
  color: oklch(var(--bc));
  font-weight: 600;
}

.prose .lead {
  color: oklch(var(--bc) / 0.8);
}

.alert-info {
  background-color: oklch(var(--in) / 0.1);
  border: 1px solid oklch(var(--in) / 0.3);
  color: oklch(var(--inc));
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  gap: 0.75rem;
  align-items: start;
}
</style>
