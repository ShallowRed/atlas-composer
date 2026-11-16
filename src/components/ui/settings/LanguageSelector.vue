<script setup lang="ts">
import type { DropdownOption } from '@/components/ui/forms/DropdownControl.vue'
import type { SupportedLocale } from '@/i18n'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import { setLocale, SUPPORTED_LOCALES } from '@/i18n'
import { getLanguageFlag } from '@/utils/language-icons'

const { locale, t } = useI18n()

const languageOptions = computed<DropdownOption[]>(() => {
  return Object.entries(SUPPORTED_LOCALES).map(([code, label]) => ({
    value: code,
    label,
    icon: getLanguageFlag(code),
    translated: true,
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
    :label="t('settings.language')"
    inline
    size="sm"
    :show-selected-icon="false"
    :show-static-icon="true"
    :show-selected-label="false"
    @update:model-value="changeLanguage"
  />
</template>
