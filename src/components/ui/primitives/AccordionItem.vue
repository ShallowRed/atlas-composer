<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string
  groupName?: string
  checked?: boolean
}

withDefaults(defineProps<Props>(), {
  subtitle: undefined,
  groupName: undefined,
  checked: false,
})
</script>

<template>
  <div class="collapse collapse-arrow join-item border bg-base-100 border-base-300">
    <input
      v-if="groupName"
      type="checkbox"
      :name="groupName"
      :checked="checked"
    >
    <div class="collapse-title text-sm font-semibold">
      {{ title }}
      <span
        v-if="subtitle"
        class="text-base-content/50"
      >({{ subtitle }})</span>
    </div>
    <div class="collapse-content">
      <slot />
    </div>
  </div>
</template>
