<script setup lang="ts">
import ViewPresetSelector from '@/components/ui/presets/ViewPresetSelector.vue'
</script>

<template>
  <div>
    <!-- View Preset Selector -->
    <ViewPresetSelector />

    <!-- Note: Built-in composite projections (d3-composite-projections library)
         have fixed internal configuration. Scale and positioning cannot be
         customized by the user. -->
  </div>
</template>
