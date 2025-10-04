<script setup lang="ts">
import FormControl from '@/components/ui/FormControl.vue'
import { useConfigStore } from '@/stores/config'

const configStore = useConfigStore()

const themes: Array<{
  key: string
  label: string
  options: Array<{
    value: string
    label: string
  }>
}> = [
  {
    key: 'light',
    label: 'Thèmes clairs',
    options: [
      { value: 'light', label: 'Light' },
      { value: 'cupcake', label: 'Cupcake' },
      { value: 'bumblebee', label: 'Bumblebee' },
      { value: 'emerald', label: 'Emerald' },
      { value: 'corporate', label: 'Corporate' },
      { value: 'retro', label: 'Retro' },
      { value: 'cyberpunk', label: 'Cyberpunk' },
      { value: 'valentine', label: 'Valentine' },
      { value: 'garden', label: 'Garden' },
      { value: 'lofi', label: 'Lofi' },
      { value: 'pastel', label: 'Pastel' },
      { value: 'fantasy', label: 'Fantasy' },
      { value: 'wireframe', label: 'Wireframe' },
      { value: 'cmyk', label: 'CMYK' },
      { value: 'autumn', label: 'Autumn' },
      { value: 'acid', label: 'Acid' },
      { value: 'lemonade', label: 'Lemonade' },
      { value: 'winter', label: 'Winter' },
      { value: 'nord', label: 'Nord' },
      { value: 'caramellatte', label: 'Caramel Latte' },
      { value: 'silk', label: 'Silk' },
    ],
  },
  {
    key: 'dark',
    label: 'Thèmes sombres',
    options: [
      { value: 'dark', label: 'Dark' },
      { value: 'synthwave', label: 'Synthwave' },
      { value: 'halloween', label: 'Halloween' },
      { value: 'forest', label: 'Forest' },
      { value: 'aqua', label: 'Aqua' },
      { value: 'black', label: 'Black' },
      { value: 'luxury', label: 'Luxury' },
      { value: 'dracula', label: 'Dracula' },
      { value: 'business', label: 'Business' },
      { value: 'night', label: 'Night' },
      { value: 'coffee', label: 'Coffee' },
      { value: 'dim', label: 'Dim' },
      { value: 'sunset', label: 'Sunset' },
      { value: 'abyss', label: 'Abyss' },
    ],
  },
]
</script>

<template>
  <FormControl
    v-model="configStore.theme"
    label="Thème"
    icon="ri-palette-line"
    type="select"
    :option-groups="themes"
    @change="configStore.setTheme(configStore.theme)"
  />
</template>
