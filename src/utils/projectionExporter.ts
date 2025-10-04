import type { GeoProjection } from 'd3-geo'
import { geoConicConformal, geoMercator } from 'd3-geo'

import { getTerritoryConfig, getTerritoryVarName } from '@/constants/france-territories'

export interface TerritoryProjectionParams {
  code: string
  name: string
  center: [number, number]
  translateXCoeff: number
  translateYCoeff: number
  scale: number
  clipExtent: {
    x1: number
    y1: number
    x2: number
    y2: number
  }
}

export interface CompositeProjectionConfig {
  baseProjection: 'conic-conformal' | 'albers'
  baseRotate: [number, number]
  baseParallels?: [number, number]
  territories: TerritoryProjectionParams[]
}

/**
 * Convertit les paramètres des sliders (utilisateur) en configuration de projection composite
 */
export function clientParamsToProjectionConfig(
  clientTranslations: Record<string, { x: number, y: number }>,
  clientScales: Record<string, number>,
  baseProjectionType: 'conic-conformal' | 'albers' = 'conic-conformal',
): CompositeProjectionConfig {
  const territories: TerritoryProjectionParams[] = []

  Object.entries(clientTranslations).forEach(([code, translation]) => {
    const territoryConfig = getTerritoryConfig(code)
    if (!territoryConfig)
      return

    const scale = clientScales[code] || 1.0

    // Convertir les translations client (-15 à +15, -10 à +10) en coefficients
    // Ces coefficients seront multipliés par le scale de base (k)
    const translateXCoeff = translation.x * 0.008 // Facteur empirique ajusté
    const translateYCoeff = translation.y * 0.008

    territories.push({
      code,
      name: territoryConfig.name,
      center: territoryConfig.center,
      translateXCoeff,
      translateYCoeff,
      scale,
      clipExtent: territoryConfig.clipExtent || { x1: 0, y1: 0, x2: 0.1, y2: 0.1 },
    })
  })

  return {
    baseProjection: baseProjectionType,
    baseRotate: [-3, -46.2],
    baseParallels: baseProjectionType === 'conic-conformal' ? [0, 60] : [44, 49],
    territories,
  }
}

/**
 * Crée une projection composite dynamique à partir de la configuration
 * Cette projection fonctionne comme ConicConformalFrance
 */
export function createCustomCompositeProjection(config: CompositeProjectionConfig): () => GeoProjection {
  return function () {
    let cache: any
    let cacheStream: any

    const epsilon = 1e-6

    // Projection de base (métropole)
    const europe = geoConicConformal()
      .rotate(config.baseRotate)
      .parallels(config.baseParallels || [0, 60])

    let europePoint: any
    let point: [number, number] | null = null
    const pointStream: any = {
      point(x: number, y: number) {
        point = [x, y]
      },
      sphere() {},
      lineStart() {},
      lineEnd() {},
      polygonStart() {},
      polygonEnd() {},
    }

    // Créer les projections Mercator pour chaque territoire
    const territoryProjections: Array<{ projection: GeoProjection, point: any }> = config.territories.map((t) => {
      const proj = geoMercator().center(t.center)
      return {
        projection: proj,
        point: proj.stream(pointStream),
      }
    })

    function customProjection(coordinates: [number, number]): [number, number] | null {
      const x = coordinates[0]
      const y = coordinates[1]
      point = null

      // Tester d'abord la métropole
      europePoint.point(x, y)
      if (point)
        return point

      // Tester chaque territoire
      for (const terr of territoryProjections) {
        terr.point.point(x, y)
        if (point)
          return point
      }

      return null
    }

    // Implémentation des méthodes standard de projection
    ;(customProjection as any).invert = function (coordinates: [number, number]): [number, number] | null {
      const k = europe.scale()
      const t = europe.translate()
      const x = (coordinates[0] - t[0]) / k
      const y = (coordinates[1] - t[1]) / k

      // Tester métropole
      if (x >= -0.0996 && x < 0.0967 && y >= -0.0908 && y < 0.0864)
        return europe.invert!(coordinates)

      // Tester territoires
      for (const terr of territoryProjections) {
        const inv = terr.projection.invert
        if (inv) {
          const result = inv(coordinates)
          if (result)
            return result
        }
      }

      return null
    }

    ;(customProjection as any).scale = function (_?: number) {
      if (!arguments.length)
        return europe.scale()

      europe.scale(_!)

      // Appliquer le scale à chaque territoire
      config.territories.forEach((t, i) => {
        const terr = territoryProjections[i]
        if (terr) {
          terr.projection.scale(_! * t.scale)
        }
      })

      return (customProjection as any).translate(europe.translate())
    }

    ;(customProjection as any).translate = function (_?: [number, number]) {
      if (!arguments.length)
        return europe.translate()

      const k = europe.scale()
      const x = +_![0]
      const y = +_![1]

      // Clipper et positionner la métropole
      europePoint = europe
        .translate(_!)
        .clipExtent([
          [x - 0.0996 * k, y - 0.0908 * k],
          [x + 0.0967 * k, y + 0.0864 * k],
        ])
        .stream(pointStream)

      // Positionner chaque territoire
      config.territories.forEach((t, i) => {
        const terr = territoryProjections[i]
        if (terr) {
          terr.point = terr.projection
            .translate([
              x + t.translateXCoeff * k,
              y + t.translateYCoeff * k,
            ])
            .clipExtent([
              [x + t.clipExtent.x1 * k + epsilon, y + t.clipExtent.y1 * k + epsilon],
              [x + t.clipExtent.x2 * k - epsilon, y + t.clipExtent.y2 * k - epsilon],
            ])
            .stream(pointStream)
        }
      })

      return reset()
    }

    ;(customProjection as any).stream = function (stream: any) {
      return cache && cacheStream === stream
        ? cache
        : (cache = multiplex([
            europe.stream(cacheStream = stream),
            ...territoryProjections.map(t => t.projection.stream(stream)),
          ]))
    }

    function multiplex(streams: any[]) {
      const n = streams.length
      return {
        point(x: number, y: number) {
          for (let i = 0; i < n; i++)
            streams[i].point(x, y)
        },
        sphere() {
          for (let i = 0; i < n; i++)
            streams[i].sphere()
        },
        lineStart() {
          for (let i = 0; i < n; i++)
            streams[i].lineStart()
        },
        lineEnd() {
          for (let i = 0; i < n; i++)
            streams[i].lineEnd()
        },
        polygonStart() {
          for (let i = 0; i < n; i++)
            streams[i].polygonStart()
        },
        polygonEnd() {
          for (let i = 0; i < n; i++)
            streams[i].polygonEnd()
        },
      }
    }

    function reset() {
      cache = cacheStream = null
      return customProjection as any
    }

    return (customProjection as any).scale(2700)
  }
}

/**
 * Génère le code TypeScript d'une projection composite personnalisée
 */
export function generateProjectionCode(config: CompositeProjectionConfig): string {
  const formatNumber = (n: number): string => {
    return n >= 0 ? `${n.toFixed(4)}` : `${n.toFixed(4)}`
  }

  const territoriesInit = config.territories.map((t) => {
    const varName = getTerritoryVarName(t.code)
    return `  // ${t.name}
  const ${varName} = geoMercator()
    .center([${t.center[0]}, ${t.center[1]}])
  let ${varName}Point = ${varName}.stream(pointStream)`
  }).join('\n\n')

  const scaleAssignments = config.territories.map((t) => {
    const varName = getTerritoryVarName(t.code)
    return `    ${varName}.scale(_ * ${t.scale})`
  }).join('\n')

  const translateAssignments = config.territories.map((t) => {
    const varName = getTerritoryVarName(t.code)
    return `    ${varName}Point = ${varName}
      .translate([x + ${formatNumber(t.translateXCoeff)} * k, y + ${formatNumber(t.translateYCoeff)} * k])
      .clipExtent([
        [x + ${formatNumber(t.clipExtent.x1)} * k + epsilon, y + ${formatNumber(t.clipExtent.y1)} * k + epsilon],
        [x + ${formatNumber(t.clipExtent.x2)} * k - epsilon, y + ${formatNumber(t.clipExtent.y2)} * k - epsilon]
      ])
      .stream(pointStream)`
  }).join('\n\n')

  const pointChecks = config.territories.map((t) => {
    const varName = getTerritoryVarName(t.code)
    return `      (${varName}Point.point(x, y), point)`
  }).join(' ||\n')

  const streamList = config.territories.map((t) => {
    const varName = getTerritoryVarName(t.code)
    return `        ${varName}.stream(cacheStream = stream),`
  }).join('\n')

  return `import { geoConicConformal, geoMercator } from 'd3-geo'
import type { GeoProjection } from 'd3-geo'

const epsilon = 1e-6

/**
 * Projection composite personnalisée pour la France
 * Générée à partir de la configuration utilisateur
 */
export default function customCompositeProjection(): GeoProjection {
  let cache: any
  let cacheStream: any

  // Projection de base pour la France métropolitaine
  const europe = geoConicConformal()
    .rotate([${config.baseRotate[0]}, ${config.baseRotate[1]}])
    .parallels([${config.baseParallels?.[0] || 0}, ${config.baseParallels?.[1] || 60}])

  let europePoint: any
  let point: [number, number] | null = null
  const pointStream = {
    point(x: number, y: number) {
      point = [x, y]
    },
  }

  // Projections Mercator pour chaque territoire d'outre-mer
${territoriesInit}

  function projection(coordinates: [number, number]): [number, number] | null {
    const x = coordinates[0]
    const y = coordinates[1]
    return (point = null,
      (europePoint.point(x, y), point) ||
${pointChecks}
    )
  }

  ;(projection as any).scale = function (_?: number) {
    if (!arguments.length) return europe.scale()

    europe.scale(_!)
${scaleAssignments}

    return (projection as any).translate(europe.translate())
  }

  ;(projection as any).translate = function (_?: [number, number]) {
    if (!arguments.length) return europe.translate()

    const k = europe.scale()
    const x = +_![0]
    const y = +_![1]

    europePoint = europe
      .translate(_!)
      .clipExtent([
        [x - 0.0996 * k, y - 0.0908 * k],
        [x + 0.0967 * k, y + 0.0864 * k]
      ])
      .stream(pointStream)

${translateAssignments}

    return reset()
  }

  ;(projection as any).stream = function (stream: any) {
    return cache && cacheStream === stream
      ? cache
      : (cache = multiplex([
          europe.stream(cacheStream = stream),
${streamList}
        ]))
  }

  function multiplex(streams: any[]) {
    const n = streams.length
    return {
      point(x: number, y: number) { for (let i = 0; i < n; i++) streams[i].point(x, y) },
      sphere() { for (let i = 0; i < n; i++) streams[i].sphere() },
      lineStart() { for (let i = 0; i < n; i++) streams[i].lineStart() },
      lineEnd() { for (let i = 0; i < n; i++) streams[i].lineEnd() },
      polygonStart() { for (let i = 0; i < n; i++) streams[i].polygonStart() },
      polygonEnd() { for (let i = 0; i < n; i++) streams[i].polygonEnd() }
    }
  }

  function reset() {
    cache = cacheStream = null
    return projection as any
  }

  return (projection as any).scale(2700)
}
`
}

/**
 * Exporte la configuration en JSON
 */
export function exportConfigAsJSON(config: CompositeProjectionConfig): string {
  return JSON.stringify(config, null, 2)
}
