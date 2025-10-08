<script setup lang="ts">
interface Props {
  viewMode: string
  activeMode: string
}

defineProps<Props>()
</script>

<template>
  <div v-show="viewMode === activeMode">
    <slot />
  </div>
</template>
