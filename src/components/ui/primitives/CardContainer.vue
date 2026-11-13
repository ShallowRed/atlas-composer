<script setup lang="ts">
import ScrollableContent from '@/components/ui/layout/ScrollableContent.vue'

interface Props {
  title?: string
  icon?: string
}

defineProps<Props>()
</script>

<template>
  <div
    class="card card-sm bg-base-100 card-border border-base-300"
  >
    <div class="card-body pb-6 max-lg:p-2">
      <div
        v-if="$slots.header"
        class="px-2 mb-4 max-lg:mb-2 max-lg:px-0"
      >
        <slot name="header" />
      </div>
      <h2
        v-else
        class="card-title px-2 mb-4 min-h-10 max-lg:mb-2 max-lg:px-0"
      >
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
        <div class="px-2 h-full max-lg:px-0">
          <slot />
        </div>
      </ScrollableContent>
      <div
        v-if="$slots.footer"
        class="px-2 pt-4 max-lg:px-0"
      >
        <slot name="footer" />
      </div>
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
