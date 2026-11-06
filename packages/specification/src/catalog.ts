import type { ProjectionFamily } from './types.js'

interface ProjectionCatalogEntry {
  family: ProjectionFamily
  aliases: readonly string[]
}

export const PROJECTION_CATALOG = {
  'azimuthal-equal-area': { family: 'AZIMUTHAL', aliases: [] },
  'azimuthal-equidistant': { family: 'AZIMUTHAL', aliases: [] },
  'gnomonic': { family: 'AZIMUTHAL', aliases: [] },
  'orthographic': { family: 'AZIMUTHAL', aliases: [] },
  'stereographic': { family: 'AZIMUTHAL', aliases: [] },
  'conic-conformal': { family: 'CONIC', aliases: [] },
  'conic-equal-area': { family: 'CONIC', aliases: ['albers'] },
  'conic-equidistant': { family: 'CONIC', aliases: [] },
  'mercator': { family: 'CYLINDRICAL', aliases: [] },
  'transverse-mercator': { family: 'CYLINDRICAL', aliases: [] },
  'equirectangular': { family: 'CYLINDRICAL', aliases: [] },
  'natural-earth': { family: 'PSEUDOCYLINDRICAL', aliases: ['natural-earth-1'] },
  'equal-earth': { family: 'PSEUDOCYLINDRICAL', aliases: [] },
} as const satisfies Record<string, ProjectionCatalogEntry>

const CATALOG_IDS: ReadonlyMap<string, string> = new Map(
  Object.entries(PROJECTION_CATALOG).flatMap(([id, { aliases }]) => aliases.map(alias => [alias, id] as const)),
)

export function resolveProjectionAlias(id: string): string {
  return CATALOG_IDS.get(id) ?? id
}
