<script setup lang="ts">
interface Props {
  icon?: string
}

defineProps<Props>()

function isEmojiIcon(icon?: string): boolean {
  return !!icon && !icon.startsWith('ri-')
}
</script>

<template>
  <!-- Icon: emoji/text -->
  <span
    v-if="isEmojiIcon(icon)"
    class="text-base"
  >
    {{ icon }}
  </span>
  <!-- Icon: CSS class (e.g., remix icons) -->
  <i
    v-else-if="icon"
    :class="icon"
  />
</template>
