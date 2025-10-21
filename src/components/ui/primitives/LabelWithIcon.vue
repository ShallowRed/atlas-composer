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
  <label
    class="fieldset-legend flex justify-start gap-1 mb-1"
    :class="{
      'text-xs': size === 'xs',
      'text-sm': size === 'sm',
      'text-md': size === 'md',
    }"
  >
    <i
      v-if="icon"
      :class="`${icon}`"
    />
    <span>
      <slot />
    </span>
  </label>
</template>
