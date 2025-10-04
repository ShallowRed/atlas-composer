<script setup lang="ts">
interface Props {
  isLoading: boolean
  title?: string
  description?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Chargement des données...',
  description: 'Préparation des cartes géographiques',
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300"
      leave-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isLoading"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body items-center text-center">
            <div class="loading loading-spinner loading-lg text-primary" />
            <h3 class="text-lg font-semibold">
              {{ title }}
            </h3>
            <p class="text-sm text-base-content/70">
              {{ description }}
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
