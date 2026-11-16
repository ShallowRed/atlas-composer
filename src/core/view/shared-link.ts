import type { AtlasId, ProjectionId } from '@/types/branded'
import type { ViewMode } from '@/types/composite'
import { getAtlasConfigPath } from '@/core/atlases/registry'
import { projectionRegistry } from '@/core/projections/registry'
import { isViewMode } from './view-mode-selection'

export interface SharedLinkTerritory {
  scale?: number
  translation?: [number, number]
}

export interface SharedLink {
  atlas?: AtlasId
  view?: ViewMode
  projection?: ProjectionId
  territoryMode?: string
  rotate?: [number, number, number]
  parallels?: [number, number]
  territories: Map<string, SharedLinkTerritory>
}

function readNumber(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined
  }
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function readNumbers(query: Record<string, unknown>, keys: string[]): number[] | undefined {
  const numbers = keys.map(key => readNumber(query[key]))
  return numbers.every(number => number !== undefined) ? numbers as number[] : undefined
}

function readTerritorySettings(value: unknown): Map<string, number> {
  const settings = new Map<string, number>()
  if (typeof value !== 'string') {
    return settings
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  }
  catch {
    return settings
  }

  if (typeof parsed === 'object' && parsed !== null) {
    for (const [key, number] of Object.entries(parsed)) {
      if (typeof number === 'number' && Number.isFinite(number)) {
        settings.set(key, number)
      }
    }
  }
  return settings
}

function readTerritories(value: unknown): Map<string, SharedLinkTerritory> {
  const settings = readTerritorySettings(value)
  const territories = new Map<string, SharedLinkTerritory>()
  const territoryOf = (code: string) => territories.get(code) ?? territories.set(code, {}).get(code)!

  for (const [key, number] of settings) {
    if (key.startsWith('s_')) {
      territoryOf(key.slice(2)).scale = number
    }
    else if (key.startsWith('tx_')) {
      const code = key.slice(3)
      const y = settings.get(`ty_${code}`)
      if (y !== undefined) {
        territoryOf(code).translation = [number, y]
      }
    }
  }
  return territories
}

export function parseSharedLink(query: Record<string, unknown>): SharedLink {
  const { atlas, view, projection, territory } = query
  const link: SharedLink = { territories: readTerritories(query.t) }

  if (typeof atlas === 'string' && getAtlasConfigPath(atlas as AtlasId)) {
    link.atlas = atlas as AtlasId
  }
  if (isViewMode(view)) {
    link.view = view
  }
  if (typeof projection === 'string') {
    link.projection = projectionRegistry.get(projection)?.id as ProjectionId | undefined
  }
  if (typeof territory === 'string' && territory !== '') {
    link.territoryMode = territory
  }

  const rotate = readNumbers(query, ['rlon', 'rlat', 'rgam'])
  if (rotate) {
    link.rotate = rotate as [number, number, number]
  }
  const parallels = readNumbers(query, ['p1', 'p2'])
  if (parallels) {
    link.parallels = parallels as [number, number]
  }

  return link
}

// The query of a shared link, which parseSharedLink reads back
export function serializeSharedLink(link: SharedLink): Record<string, string> {
  const query: Record<string, string> = {}
  const entries: Array<[string, string | undefined]> = [
    ['atlas', link.atlas],
    ['view', link.view],
    ['projection', link.projection],
    ['territory', link.territoryMode],
  ]
  for (const [key, value] of entries) {
    if (value !== undefined) {
      query[key] = value
    }
  }
  if (link.rotate) {
    [query.rlon, query.rlat, query.rgam] = link.rotate.map(String)
  }
  if (link.parallels) {
    [query.p1, query.p2] = link.parallels.map(String)
  }

  const settings: Record<string, number> = {}
  for (const [code, { scale }] of link.territories) {
    if (scale !== undefined) {
      settings[`s_${code}`] = scale
    }
  }
  for (const [code, { translation }] of link.territories) {
    if (translation) {
      [settings[`tx_${code}`], settings[`ty_${code}`]] = translation
    }
  }
  if (Object.keys(settings).length > 0) {
    query.t = JSON.stringify(settings)
  }
  return query
}
