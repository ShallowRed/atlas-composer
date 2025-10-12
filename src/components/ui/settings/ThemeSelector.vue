<script setup lang="ts">
import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()

const themes: Array<{
  key: string
  label: string
  options: Array<{
    value: string
    label: string
    translated: boolean
  }>
}> = [
  {
    key: 'light',
    label: 'Thèmes clairs',
    options: [
      { value: 'light', label: 'Light', translated: true },
      { value: 'cupcake', label: 'Cupcake', translated: true },
      { value: 'bumblebee', label: 'Bumblebee', translated: true },
      { value: 'emerald', label: 'Emerald', translated: true },
      { value: 'corporate', label: 'Corporate', translated: true },
      { value: 'retro', label: 'Retro', translated: true },
      { value: 'cyberpunk', label: 'Cyberpunk', translated: true },
      { value: 'valentine', label: 'Valentine', translated: true },
      { value: 'garden', label: 'Garden', translated: true },
      { value: 'lofi', label: 'Lofi', translated: true },
      { value: 'pastel', label: 'Pastel', translated: true },
      { value: 'fantasy', label: 'Fantasy', translated: true },
      { value: 'wireframe', label: 'Wireframe', translated: true },
      { value: 'cmyk', label: 'CMYK', translated: true },
      { value: 'autumn', label: 'Autumn', translated: true },
      { value: 'acid', label: 'Acid', translated: true },
      { value: 'lemonade', label: 'Lemonade', translated: true },
      { value: 'winter', label: 'Winter', translated: true },
      { value: 'nord', label: 'Nord', translated: true },
      { value: 'caramellatte', label: 'Caramel Latte', translated: true },
      { value: 'silk', label: 'Silk', translated: true },
    ],
  },
  {
    key: 'dark',
    label: 'Thèmes sombres',
    options: [
      { value: 'dark', label: 'Dark', translated: true },
      { value: 'synthwave', label: 'Synthwave', translated: true },
      { value: 'halloween', label: 'Halloween', translated: true },
      { value: 'forest', label: 'Forest', translated: true },
      { value: 'aqua', label: 'Aqua', translated: true },
      { value: 'black', label: 'Black', translated: true },
      { value: 'luxury', label: 'Luxury', translated: true },
      { value: 'dracula', label: 'Dracula', translated: true },
      { value: 'business', label: 'Business', translated: true },
      { value: 'night', label: 'Night', translated: true },
      { value: 'coffee', label: 'Coffee', translated: true },
      { value: 'dim', label: 'Dim', translated: true },
      { value: 'sunset', label: 'Sunset', translated: true },
      { value: 'abyss', label: 'Abyss', translated: true },
    ],
  },
]
</script>

<template>
  <DropdownControl
    v-model="uiStore.theme"
    inline
    label="Thème"
    icon="ri-palette-line"
    :option-groups="themes"
    size="sm"
    :show-selected-icon="true"
    :show-static-icon="true"
    :show-selected-label="false"
    @change="uiStore.setTheme(uiStore.theme)"
  />
</template>
