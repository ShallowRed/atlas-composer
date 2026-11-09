import type { ProjectionDefinition } from '../types'
import { geoAzimuthalEqualArea, geoAzimuthalEquidistant, geoGnomonic, geoOrthographic, geoStereographic } from 'd3-geo'
import { ProjectionCategory, ProjectionFamily, ProjectionStrategy } from '../types'

const AZIMUTHAL_EQUAL_AREA: ProjectionDefinition = {
  id: 'azimuthal-equal-area',
  name: 'projections.azimuthalEqualArea.name',
  description: 'projections.azimuthalEqualArea.description',
  aliases: ['azimuthalEqualArea', 'lambertAzimuthal'],
  category: ProjectionCategory.AZIMUTHAL,
  family: ProjectionFamily.AZIMUTHAL,
  strategy: ProjectionStrategy.D3_BUILTIN,
  create: geoAzimuthalEqualArea,

  capabilities: {
    preserves: ['area', 'direction'],
    distorts: ['angle', 'distance'],
    supportsComposite: true,
    supportsSplit: true,
    supportsUnified: true,
  },

  creator: 'Johann Heinrich Lambert',
  year: 1772,
}

const AZIMUTHAL_EQUIDISTANT: ProjectionDefinition = {
  id: 'azimuthal-equidistant',
  name: 'projections.azimuthalEquidistant.name',
  description: 'projections.azimuthalEquidistant.description',
  aliases: ['azimuthalEquidistant'],
  category: ProjectionCategory.AZIMUTHAL,
  family: ProjectionFamily.AZIMUTHAL,
  strategy: ProjectionStrategy.D3_BUILTIN,
  create: geoAzimuthalEquidistant,

  capabilities: {
    preserves: ['distance', 'direction'],
    distorts: ['area', 'angle'],
    supportsComposite: true,
    supportsSplit: true,
    supportsUnified: true,
  },

}

const STEREOGRAPHIC: ProjectionDefinition = {
  id: 'stereographic',
  name: 'projections.stereographic.name',
  description: 'projections.stereographic.description',
  category: ProjectionCategory.AZIMUTHAL,
  family: ProjectionFamily.AZIMUTHAL,
  strategy: ProjectionStrategy.D3_BUILTIN,
  create: geoStereographic,

  capabilities: {
    preserves: ['angle'],
    distorts: ['area', 'distance'],
    supportsComposite: true,
    supportsSplit: true,
    supportsUnified: true,
  },

}

const ORTHOGRAPHIC: ProjectionDefinition = {
  id: 'orthographic',
  name: 'projections.orthographic.name',
  description: 'projections.orthographic.description',
  category: ProjectionCategory.AZIMUTHAL,
  family: ProjectionFamily.AZIMUTHAL,
  strategy: ProjectionStrategy.D3_BUILTIN,
  create: geoOrthographic,

  capabilities: {
    preserves: [],
    distorts: ['area', 'angle', 'distance', 'direction'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
  },

}

const GNOMONIC: ProjectionDefinition = {
  id: 'gnomonic',
  name: 'projections.gnomonic.name',
  description: 'projections.gnomonic.description',
  category: ProjectionCategory.AZIMUTHAL,
  family: ProjectionFamily.AZIMUTHAL,
  strategy: ProjectionStrategy.D3_BUILTIN,
  create: geoGnomonic,

  capabilities: {
    preserves: [],
    distorts: ['area', 'angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: false,
  },

}

export const AZIMUTHAL_PROJECTIONS: ProjectionDefinition[] = [
  AZIMUTHAL_EQUAL_AREA,
  AZIMUTHAL_EQUIDISTANT,
  STEREOGRAPHIC,
  ORTHOGRAPHIC,
  GNOMONIC,
]
