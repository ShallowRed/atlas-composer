<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <header class="">
    <!-- Navigation Bar -->
    <nav class="container mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <RouterLink
          to="/"
          class="text-2xl font-bold flex items-center gap-2 hover:opacity-80 transition"
        >
          <i class="ri-map-2-fill" />
          Cartographies Responsives
        </RouterLink>

        <div class="flex items-center gap-4">
          <RouterLink
            to="/"
            class="btn btn-ghost btn-sm"
            :class="{ 'btn-active': route.path === '/' }"
          >
            <i class="ri-map-line" />
            Cartes
          </RouterLink>
          <RouterLink
            to="/about"
            class="btn btn-ghost btn-sm"
            :class="{ 'btn-active': route.path === '/about' }"
          >
            <i class="ri-information-line" />
            À propos
          </RouterLink>
        </div>
      </div>
    </nav>
  </header>
</template>
