<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <footer class="footer footer-center bg-neutral text-neutral-content py-10">
    <nav class="grid grid-flow-col gap-4">
      <RouterLink to="/" class="link link-hover">
        Carte
      </RouterLink>
      <RouterLink to="/about" class="link link-hover">
        À propos
      </RouterLink>
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
        Cartographies Responsives - Un projet de visualisation cartographique interactive
      </p>
      <p class="text-xs">
        Construit avec Vue 3, D3.js, Observable Plot et daisyUI
      </p>
    </aside>

    <aside class="text-xs">
      <p>© {{ new Date().getFullYear() }} - Tous droits réservés</p>
    </aside>
  </footer>
</template>
