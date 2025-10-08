<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import CardContainer from '@/components/ui/CardContainer.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'

const { t } = useI18n()
</script>

<template>
  <div class="container mx-auto py-8 max-w-4xl">
    <div class="flex flex-col gap-6">
      <!-- Introduction -->
      <CardContainer
        :title="t('about.pageTitle')"
        icon="ri-map-2-line"
      >
        <div class="prose max-w-none space-y-4">
          <p class="text-lg">
            {{ t('about.intro') }}
          </p>
        </div>
      </CardContainer>

      <!-- The Problem -->
      <CardContainer
        :title="t('about.challenge.title')"
        icon="ri-error-warning-line"
      >
        <div class="prose max-w-none space-y-4">
          <p>
            {{ t('about.challenge.description1') }}
          </p>

          <p>
            {{ t('about.challenge.description2') }}
          </p>
          <p>
            {{ t('about.challenge.description3') }}
          </p>
        </div>
      </CardContainer>

      <!-- The Solution -->
      <CardContainer
        :title="t('about.solution.title')"
        icon="ri-compass-3-line"
      >
        <div class="prose max-w-none space-y-4">
          <p>
            {{ t('about.solution.description') }}
          </p>

          <SectionHeader
            :title="t('about.solution.modesTitle')"
            :level="3"
          />

          <ul class="list-disc pl-6 space-y-2">
            <li>
              {{ t('about.features.compositeExisting') }}
            </li>
            <li>
              {{ t('about.features.compositeCustom') }}
            </li>
            <li>
              {{ t('about.features.split') }}
            </li>
            <li>
              {{ t('about.features.unified') }}
            </li>
          </ul>
        </div>
      </CardContainer>

      <!-- Regions -->
      <CardContainer
        :title="t('about.atlases.title')"
        icon="ri-global-line"
      >
        <div class="prose max-w-none">
          <ul class="list-disc pl-6 space-y-2">
            <li>
              {{ t('about.atlases.france') }}
            </li>
            <li>
              {{ t('about.atlases.portugal') }}
            </li>
            <li>
              {{ t('about.atlases.eu') }}
            </li>
          </ul>
        </div>
      </CardContainer>

      <!-- Stack -->
      <CardContainer
        :title="t('about.technologies.title')"
        icon="ri-code-box-line"
      >
        <div class="prose max-w-none">
          <ul class="list-disc pl-6 space-y-2 text-sm">
            <li>{{ t('about.technologies.d3') }}</li>
            <li>{{ t('about.technologies.plot') }}</li>
            <li>{{ t('about.technologies.vue') }}</li>
            <li>{{ t('about.technologies.topojson') }}</li>
          </ul>
        </div>
      </CardContainer>

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
