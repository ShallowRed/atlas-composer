/**
 * Types for the options of an initialization and of a preset load
 */

import type { SharedLink } from '@/core/view'
import type { PresetId } from '@/types/branded'

export interface AtlasInitializationOptions {
  preserveViewMode?: boolean // Try to keep current view mode if supported
  sharedLink?: SharedLink
}

export interface PresetLoadOptions {
  presetId: PresetId
  skipValidation?: boolean // For testing only
}
