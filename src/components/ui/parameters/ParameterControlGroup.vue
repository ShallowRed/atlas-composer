<script setup lang="ts">
interface Props {
  title: string
  description?: string
}

withDefaults(defineProps<Props>(), {
  description: undefined,
})
</script>

<template>
  <div class="parameter-control-group">
    <!-- Group Header -->
    <div class="group-header mb-3">
      <h4 class="text-sm font-medium text-base-content">
        {{ title }}
      </h4>
      <p
        v-if="description"
        class="text-xs text-base-content/70 mt-1"
      >
        {{ description }}
      </p>
    </div>

    <!-- Parameter Controls -->
    <div class="space-y-3">
      <slot />
    </div>
  </div>
</template>
