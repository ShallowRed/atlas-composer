<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import CardContainer from '@/components/ui/primitives/CardContainer.vue'

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-6">
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

    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <CardContainer
        :title="t('about.why.title')"
        icon="ri-lightbulb-line"
      >
        <div class="prose max-w-none text-base">
          <p>
            {{ t('about.why.description') }}
          </p>
        </div>
      </CardContainer>

      <CardContainer
        :title="t('about.features.title')"
        icon="ri-list-check"
      >
        <div class="prose max-w-none">
          <ul class="list-disc text-base pl-6 space-y-2">
            <li>{{ t('about.features.compositeExisting') }}</li>
            <li>{{ t('about.features.compositeCustom') }}</li>
            <li>{{ t('about.features.split') }}</li>
            <li>{{ t('about.features.unified') }}</li>
            <li>{{ t('about.features.export') }}</li>
          </ul>
        </div>
      </CardContainer>

      <CardContainer
        :title="t('about.atlases.title')"
        icon="ri-global-line"
      >
        <div class="prose max-w-none">
          <ul class="list-disc pl-6 space-y-2 text-base">
            <li>{{ t('about.atlases.france') }}</li>
            <li>{{ t('about.atlases.portugal') }}</li>
            <li>{{ t('about.atlases.spain') }}</li>
            <li>{{ t('about.atlases.europe') }}</li>
            <li>{{ t('about.atlases.usa') }}</li>
          </ul>
        </div>
      </CardContainer>
    </div>

    <div class="join py-6 mx-auto">
      <RouterLink
        to="/"
        class="btn btn-wide btn-primary btn-lg w-48 join-item"
      >
        {{ t('about.cta') }}
        <i class="ri-flask-line" />
      </RouterLink>
      <a
        href="https://github.com/shallowred/atlas-composer"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-wide btn-primary btn-outline btn-lg w-48 join-item"
      >
        GitHub
        <i class="ri-github-line" />
      </a>
    </div>
  </div>
</template>
