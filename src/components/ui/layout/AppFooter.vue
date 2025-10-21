<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()
</script>

<template>
  <footer class="footer footer-center bg-neutral text-neutral-content py-10">
    <aside class="!justify-items-start">
      <p class="font-bold text-lg text-right">
        {{ t('about.footer.title') }}
      </p>
      <p class="text-sm opacity-80">
        {{ t('about.footer.description') }}
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
      <span
        v-else
        class="opacity-70 cursor-default"
      >
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
      <span
        v-else
        class="opacity-70 cursor-default"
      >
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

    <aside class="text-xs opacity-80 !justify-items-end">
      <p>{{ t('about.footer.builtWith') }}</p>
      <p>
        {{ t('about.footer.license') }}
        <a
          href="https://github.com/shallowred/atlas-composer/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          class="link link-hover"
        >
          MIT License
        </a>
      </p>
    </aside>
  </footer>
</template>
