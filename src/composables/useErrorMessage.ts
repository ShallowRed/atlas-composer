import type { PickupKeys } from 'vue-i18n'
import type { AppError } from '@/core/types/errors'
import type { MessageSchema } from '@/i18n'
import { useI18n } from 'vue-i18n'

export const ERROR_MESSAGE_KEYS = {
  GEODATA_NOT_FOUND: 'errors.geoData.notFound',
  GEODATA_INVALID_JSON: 'errors.geoData.invalidJson',
  GEODATA_UNREACHABLE: 'errors.geoData.unreachable',
  GEODATA_NETWORK_ERROR: 'errors.geoData.networkError',
  GEODATA_MISSING_OBJECT: 'errors.geoData.missingObject',
  GEODATA_INVALID_STRUCTURE: 'errors.geoData.invalidStructure',
  INITIALIZATION_FAILED: 'errors.initializationFailed',
} as const satisfies Record<AppError['code'], PickupKeys<{ en: MessageSchema }>>

export function useErrorMessage() {
  const { t } = useI18n()

  function errorMessage(error: AppError): string {
    const { code, ...fields } = error
    return t(ERROR_MESSAGE_KEYS[code], fields)
  }

  return { errorMessage }
}
