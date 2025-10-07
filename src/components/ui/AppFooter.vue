<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

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
        Carte
      </RouterLink>
      <span v-else class="opacity-70 cursor-default">
        Carte
      </span>

      <RouterLink
        v-if="route.path !== '/about'"
        to="/about"
        class="link link-hover"
      >
        À propos
      </RouterLink>
      <span v-else class="opacity-70 cursor-default">
        À propos
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
        Geo projection sandbox
      </p>
      <p class="text-xs">
        Construit avec Vue 3, D3.js, Observable Plot et daisyUI
      </p>
    </aside>

    <aside class="text-xs">
      <p>License MIT</p>
    </aside>
  </footer>
</template>
