import type { AtlasId } from '@/types/branded'

const ATLAS_FLAGS: Record<string, string> = {
  'france': '🇫🇷',
  'portugal': '🇵🇹',
  'spain': '🇪🇸',
  'europe': '🇪🇺',
  'macaronesia': '🏝️',
  'usa': '🇺🇸',
  'netherlands': '🇳🇱',
  'norway': '🇳🇴',
  'japan': '🇯🇵',
  'ecuador': '🇪🇨',
  'chile': '🇨🇱',
  'malaysia': '🇲🇾',
  'new-zealand': '🇳🇿',
  'south-africa': '🇿🇦',
  'brazil': '🇧🇷',
  'equatorial-guinea': '🇬🇶',
  'united-kingdom': '🇬🇧',
  'denmark': '🇩🇰',
  'south-west-indian-ocean': '🏝️',
  'world': '🌍',
}

export function getAtlasFlag(atlasId: AtlasId): string | undefined {
  return ATLAS_FLAGS[atlasId]
}
