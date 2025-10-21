<script setup lang="ts">
import ScrollableContent from '@/components/ui/layout/ScrollableContent.vue'

interface Props {
  title: string
  icon: string
}

defineProps<Props>()
</script>

<template>
  <div
    class="card card-sm bg-base-100 card-border border-base-300"
  >
    <div class="card-body pb-6">
      <h2 class="card-title px-2 mb-4">
        <i :class="icon" />
        {{ title }}
        <div class="ml-auto">
          <slot name="actions" />
        </div>
      </h2>
      <ScrollableContent
        show-gradient
        gradient-color="var(--color-base-100)"
      >
        <div class="px-2 h-full">
          <slot />
        </div>
      </ScrollableContent>
    </div>
  </div>
</template>

<style scoped>
.card-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>
