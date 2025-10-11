<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()
</script>

<template>
  <footer class="footer footer-center bg-neutral text-neutral-content py-10">
    <aside>
      <p class="text-sm">
        {{ t('about.footer.title') }}
      </p>
    </aside>

    <nav class="grid grid-flow-col gap-4">
      <RouterLink
        v-if="route.path !== '/'"
        to="/"
        class="link link-hover"
      >
        <i class="ri-layout-line" />
        {{ t('nav.map') }}
      </RouterLink>
      <span v-else class="opacity-70 cursor-default">
        <i class="ri-layout-line" />
        {{ t('nav.map') }}
      </span>

      <RouterLink
        v-if="route.path !== '/about'"
        to="/about"
        class="link link-hover"
      >
        <i class="ri-information-2-line" />

        {{ t('nav.about') }}
      </RouterLink>
      <span v-else class="opacity-70 cursor-default">
        <i class="ri-information-2-line" />

        {{ t('nav.about') }}
      </span>

      <a
        href="https://github.com/shallowred/atlas-composer"
        target="_blank"
        rel="noopener noreferrer"
        class="link link-hover"
      >
        <i class="ri-github-line" />
        GitHub
      </a>
    </nav>

    <aside class="text-xs">
      <p>{{ t('about.footer.license') }}</p>
    </aside>
  </footer>
</template>
