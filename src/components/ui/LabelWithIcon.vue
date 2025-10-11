<script setup lang="ts">
/**
 * LabelWithIcon - Label wrapper with optional icon
 *
 * Features:
 * - Consistent label styling
 * - Optional icon support
 * - Size variants
 * - Slot-based content for flexibility
 */

interface Props {
  icon?: string
  size?: 'xs' | 'sm' | 'md'
}

withDefaults(defineProps<Props>(), {
  icon: undefined,
  size: 'xs',
})
</script>

<template>
  <label class="label">
    <span :class="`label-text text-${size}`">
      <i v-if="icon" :class="`${icon}`" />
      <slot />
    </span>
  </label>
</template>
