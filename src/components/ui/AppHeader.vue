<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <header>
    <!-- Navigation Bar -->
    <div class="bg-base-100 shadow-sm">
      <div class="container max-w-auto m-auto">
        <nav class="navbar">
          <div class="flex-1">
            <RouterLink
              v-if="route.path !== '/'"
              to="/"
              class="btn btn-ghost text-lg"
            >
              <i class="ri-map-2-fill" />
              Geo projection sandbox
            </RouterLink>
            <span
              v-else
              class="text-lg font-semibold flex items-center gap-2 px-4"
            >
              <i class="ri-map-2-fill" />
              Geo projection sandbox
            </span>
          </div>
          <div class="flex-none">
            <ul class="menu menu-horizontal px-1">
              <li :class="{ 'disabled pointer-events-none': route.path === '/' }">
                <RouterLink
                  v-if="route.path !== '/'"
                  to="/"
                >
                  <i class="ri-map-line" />
                  Cartes
                </RouterLink>
                <span v-else class="text-primary font-semibold flex items-center gap-2">
                  <i class="ri-map-line" />
                  Cartes
                </span>
              </li>
              <li :class="{ 'disabled pointer-events-none': route.path === '/about' }">
                <RouterLink
                  v-if="route.path !== '/about'"
                  to="/about"
                >
                  <i class="ri-information-line" />
                  À propos
                </RouterLink>
                <span v-else class="text-primary font-semibold flex items-center gap-2">
                  <i class="ri-information-line" />
                  À propos
                </span>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </div>
  </header>
</template>
