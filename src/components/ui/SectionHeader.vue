<script setup lang="ts">
interface Props {
  title: string
  description?: string
  icon?: string
  level?: 2 | 3
}

withDefaults(defineProps<Props>(), {
  description: undefined,
  icon: undefined,
  level: 2,
})
</script>

<template>
  <div>
    <component
      :is="level === 2 ? 'h2' : 'h3'"
      :class="level === 2 ? 'card-title mb-2' : 'text-lg font-semibold mb-2'"
    >
      <i v-if="icon" :class="[icon, level === 2 ? 'text-lg' : 'text-lg']" />
      {{ title }}
    </component>
    <p v-if="description" class="text-sm opacity-70 mb-4">
      {{ description }}
    </p>
  </div>
</template>
