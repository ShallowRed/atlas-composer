/**
 * Atlas Icon Utilities
 * Maps atlas IDs to visual indicators (flags/icons)
 */

export interface AtlasIconConfig {
  icon: string // Remix icon class or flag emoji
  flag?: string // Country flag emoji
}

const ATLAS_ICONS: Record<string, AtlasIconConfig> = {
  'france': { icon: 'ri-flag-line', flag: '🇫🇷' },
  'portugal': { icon: 'ri-flag-line', flag: '🇵🇹' },
  'spain': { icon: 'ri-flag-line', flag: '🇪🇸' },
  'eu': { icon: 'ri-flag-line', flag: '🇪🇺' },
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

/**
 * Get icon configuration for an atlas
 */
export function getAtlasIcon(atlasId: string): AtlasIconConfig {
  return ATLAS_ICONS[atlasId] || { icon: 'ri-map-2-line' }
}

/**
 * Get flag emoji for an atlas (for display in dropdown options)
 */
export function getAtlasFlag(atlasId: string): string | undefined {
  return ATLAS_ICONS[atlasId]?.flag
}
