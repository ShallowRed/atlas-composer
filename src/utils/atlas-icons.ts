/**
 * Atlas Icon Utilities
 * Maps atlas IDs to visual indicators (flags/icons)
 */

import type { AtlasId } from '@/types/branded'

export interface AtlasIconConfig {
  icon: string // Remix icon class or flag emoji
  flag?: string // Country flag emoji
}

const ATLAS_ICONS: Record<string, AtlasIconConfig> = {
  'france': { icon: 'ri-flag-line', flag: '🇫🇷' },
  'portugal': { icon: 'ri-flag-line', flag: '🇵🇹' },
  'spain': { icon: 'ri-flag-line', flag: '🇪🇸' },
  'europe': { icon: 'ri-flag-line', flag: '🇪🇺' },
  'usa': { icon: 'ri-flag-line', flag: '🇺🇸' },
  'netherlands': { icon: 'ri-flag-line', flag: '🇳🇱' },
  'japan': { icon: 'ri-flag-line', flag: '🇯🇵' },
  'ecuador': { icon: 'ri-flag-line', flag: '🇪🇨' },
  'chile': { icon: 'ri-flag-line', flag: '🇨🇱' },
  'malaysia': { icon: 'ri-flag-line', flag: '🇲🇾' },
  'equatorial-guinea': { icon: 'ri-flag-line', flag: '🇬🇶' },
  'united-kingdom': { icon: 'ri-flag-line', flag: '🇬🇧' },
  'denmark': { icon: 'ri-flag-line', flag: '🇩🇰' },
  'world': { icon: 'ri-global-line', flag: '🌍' },
}

export function getAtlasIcon(atlasId: AtlasId): AtlasIconConfig {
  return ATLAS_ICONS[atlasId] || { icon: 'ri-map-2-line' }
}

export function getAtlasFlag(atlasId: AtlasId): string | undefined {
  return ATLAS_ICONS[atlasId]?.flag
}
