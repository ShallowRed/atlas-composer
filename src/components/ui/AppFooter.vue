<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()
</script>

<template>
  <footer class="footer footer-center bg-neutral text-neutral-content py-10">
    <nav class="grid grid-flow-col gap-4">
      <RouterLink
        v-if="route.path !== '/'"
        to="/"
        class="link link-hover"
      >
        {{ t('nav.map') }}
      </RouterLink>
      <span v-else class="opacity-70 cursor-default">
        {{ t('nav.map') }}
      </span>

      <RouterLink
        v-if="route.path !== '/about'"
        to="/about"
        class="link link-hover"
      >
        {{ t('nav.about') }}
      </RouterLink>
      <span v-else class="opacity-70 cursor-default">
        {{ t('nav.about') }}
      </span>

      <a
        href="https://github.com"
        target="_blank"
        rel="noopener noreferrer"
        class="link link-hover"
      >
        GitHub
      </a>
    </nav>

    <aside>
      <p class="text-sm">
        {{ t('about.footer.title') }}
      </p>
      <p class="text-xs">
        {{ t('about.footer.built') }}
      </p>
    </aside>

    <aside class="text-xs">
      <p>{{ t('about.footer.license') }}</p>
    </aside>
  </footer>
</template>
