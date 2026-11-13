import type { AtlasId } from '@/types/branded'

const ATLAS_FLAGS: Record<string, string> = {
  'france': '🇫🇷',
  'portugal': '🇵🇹',
  'spain': '🇪🇸',
  'europe': '🇪🇺',
  'usa': '🇺🇸',
  'netherlands': '🇳🇱',
  'norway': '🇳🇴',
  'japan': '🇯🇵',
  'ecuador': '🇪🇨',
  'chile': '🇨🇱',
  'malaysia': '🇲🇾',
  'new-zealand': '🇳🇿',
  'equatorial-guinea': '🇬🇶',
  'united-kingdom': '🇬🇧',
  'denmark': '🇩🇰',
  'world': '🌍',
}

export function getAtlasFlag(atlasId: AtlasId): string | undefined {
  return ATLAS_FLAGS[atlasId]
}
