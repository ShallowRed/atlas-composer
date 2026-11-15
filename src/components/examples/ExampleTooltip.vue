<script setup lang="ts">
defineProps<{ x: number, y: number }>()
</script>

<template>
  <div
    class="pointer-events-none absolute z-10 flex flex-col rounded-field border border-base-300 bg-base-100 px-2.5 py-1.5 text-xs shadow-md whitespace-nowrap"
    :style="{ left: `${x + 12}px`, top: `${y - 12}px` }"
  >
    <slot />
  </div>
</template>
