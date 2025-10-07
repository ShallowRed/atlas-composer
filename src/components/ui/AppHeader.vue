<script setup lang="ts">
import { RouterLink } from 'vue-router'
// import { RouterLink, useRoute } from 'vue-router'

// const route = useRoute()
</script>

<template>
  <header class="">
    <!-- Navigation Bar -->
    <div class="bg-base-100 shadow-sm">
      <div class="container max-w-auto m-auto">
        <nav class="navbar">
          <div class="flex-1">
            <RouterLink to="/" class="btn btn-ghost text-lg">
              <i class="ri-map-2-fill" />
              Geo projection sandbox
            </RouterLink>
          </div>
          <div class="flex-none">
            <ul class="menu menu-horizontal px-1">
              <li>
                <RouterLink to="/">
                  <i class="ri-map-line" />
                  Cartes
                </RouterLink>
              </li>
              <li>
                <RouterLink to="/about">
                  <i class="ri-information-line" />
                  À propos
                </RouterLink>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </div>
  </header>
</template>
