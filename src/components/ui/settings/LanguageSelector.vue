<script setup lang="ts">
import type { DropdownOption } from '@/components/ui/forms/DropdownControl.vue'
import type { SupportedLocale } from '@/i18n'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import { setLocale, SUPPORTED_LOCALES } from '@/i18n'

const { locale } = useI18n()

// Convert SUPPORTED_LOCALES to DropdownOption format
const languageOptions = computed<DropdownOption[]>(() => {
  return Object.entries(SUPPORTED_LOCALES).map(([code, label]) => ({
    value: code,
    label, // Already translated labels
  }))
})

function changeLanguage(newLocale: string) {
  setLocale(newLocale as SupportedLocale)
}
</script>

<template>
  <DropdownControl
    :model-value="locale"
    :options="languageOptions"
    icon="ri-translate-2"
    label=""
    @update:model-value="changeLanguage"
  />
</template>
