import type { CanvasDimensions } from '@atlas-composer/specification'
import type { Arrangement, ScaleMode } from '@/core/territories/proposal'
import type { AtlasId, ProjectionId } from '@/types/branded'
import type { ViewMode } from '@/types/composite'
import { getAtlasConfigPath } from '@/core/atlases/registry'
import { CANVAS_LENGTH_CONTROL } from '@/core/parameters/composition-controls'
import { projectionRegistry } from '@/core/projections/registry'
import { ARRANGEMENTS, SCALE_MODES } from '@/core/territories/proposal'
import { isViewMode } from './view-mode-selection'

export interface SharedLinkTerritory {
  scale?: number
  translation?: [number, number]
}

// The largest side of a canvas that a link gives, in pixels: the control of the canvas has no upper bound
const SHARED_CANVAS_MAX_LENGTH = 4000

// A proposal in a link: its composed territories, those added after it in their order, its options and its canvas
export interface SharedLinkProposal {
  codes: string[]
  added: string[]
  arrangement: Arrangement
  scaleMode: ScaleMode
  canvas?: CanvasDimensions
}

export interface SharedLink {
  atlas?: AtlasId
  view?: ViewMode
  projection?: ProjectionId
  territoryMode?: string
  rotate?: [number, number, number]
  parallels?: [number, number]
  territories: Map<string, SharedLinkTerritory>
  proposal?: SharedLinkProposal
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

function readCodes(value: unknown): string[] {
  return typeof value === 'string' ? value.split(',').filter(code => code !== '') : []
}

function readCanvas(value: unknown): CanvasDimensions | undefined {
  const match = typeof value === 'string' ? /^(\d+)x(\d+)$/.exec(value) : null
  const [width, height] = match ? [Number(match[1]), Number(match[2])] : []
  const inBounds = (length: number | undefined) => length !== undefined && length >= CANVAS_LENGTH_CONTROL.domain.min && length <= SHARED_CANVAS_MAX_LENGTH
  return inBounds(width) && inBounds(height) ? { width: width!, height: height! } : undefined
}

// An unknown arrangement or scale takes the starting option; a code added twice, or already composed, counts once
function readProposal(query: Record<string, unknown>): SharedLinkProposal | undefined {
  const codes = [...new Set(readCodes(query.proposal))]
  if (codes.length === 0) {
    return undefined
  }
  const added = [...new Set(readCodes(query.added))].filter(code => !codes.includes(code))
  const arrangement = ARRANGEMENTS.find(option => option === query.arrangement) ?? ARRANGEMENTS[0]
  const scaleMode = SCALE_MODES.find(option => option === query.scaleMode) ?? SCALE_MODES[0]
  const canvas = readCanvas(query.canvas)
  return { codes, added, arrangement, scaleMode, ...(canvas ? { canvas } : {}) }
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
  const proposal = readProposal(query)
  if (proposal) {
    link.proposal = proposal
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

  if (link.proposal) {
    const { codes, added, arrangement, scaleMode, canvas } = link.proposal
    query.proposal = codes.join(',')
    if (added.length > 0) {
      query.added = added.join(',')
    }
    query.arrangement = arrangement
    query.scaleMode = scaleMode
    if (canvas) {
      query.canvas = `${canvas.width}x${canvas.height}`
    }
  }
  return query
}
