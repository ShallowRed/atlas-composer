import * as d3 from 'd3-geo'

// =============================================================================
// STANDALONE ALBERS FRANCE COMPOSITE PROJECTION
// =============================================================================

export function geoAlbersFrance() {
  let cache: any
  let cacheStream: any
  // Main projection for metropolitan France
  const metro = d3.geoConicEqualArea().parallels([44, 49]).rotate([-2, 0]).center([0, 46.5])
  let metroPoint: any
  // DOM-TOM projections using EXACT same configuration as Vue Composite
  const guyane = d3.geoMercator().center([-53, 4])
  let guyanePoint: any // FR-GF
  const reunion = d3.geoMercator().center([55.5, -21])
  let reunionPoint: any // FR-RE
  const guadeloupe = d3.geoMercator().center([-61.4, 16.2])
  let guadeloupePoint: any // FR-GP
  const martinique = d3.geoMercator().center([-61, 14.6])
  let martiniquePoint: any // FR-MQ
  const mayotte = d3.geoMercator().center([45.15, -12.8])
  let mayottePoint: any // FR-YT
  let point: [number, number] | null
  const pointStream = {
    point(x: number, y: number) { point = [x, y] },
    sphere() {},
    lineStart() {},
    lineEnd() {},
    polygonStart() {},
    polygonEnd() {},
  }

  function albersFrance(coordinates: [number, number]): [number, number] | null {
    const x = coordinates[0]
    const y = coordinates[1]

    // Territory bounds for DOM-TOM (approximate geographic bounds)
    // Guyane Française: [51.6°W-54.6°W, 2.1°N-5.8°N] → [-54.6, -51.6, 2.1, 5.8]
    if (x >= -54.6 && x <= -51.6 && y >= 2.1 && y <= 5.8) {
      return (guyanePoint.point(x, y), point)
    }

    // Réunion: [55.2°E-55.8°E, -21.4°S--20.9°S] → [55.2, 55.8, -21.4, -20.9]
    if (x >= 55.2 && x <= 55.8 && y >= -21.4 && y <= -20.9) {
      return (reunionPoint.point(x, y), point)
    }

    // Guadeloupe: [61.8°W-61.0°W, 15.8°N-16.5°N] → [-61.8, -61.0, 15.8, 16.5]
    if (x >= -61.8 && x <= -61.0 && y >= 15.8 && y <= 16.5) {
      return (guadeloupePoint.point(x, y), point)
    }

    // Martinique: [61.2°W-60.8°W, 14.4°N-14.9°N] → [-61.2, -60.8, 14.4, 14.9]
    if (x >= -61.2 && x <= -60.8 && y >= 14.4 && y <= 14.9) {
      return (martiniquePoint.point(x, y), point)
    }

    // Mayotte: [45.0°E-45.3°E, -13.0°S--12.6°S] → [45.0, 45.3, -13.0, -12.6]
    if (x >= 45.0 && x <= 45.3 && y >= -13.0 && y <= -12.6) {
      return (mayottePoint.point(x, y), point)
    }

    // Additional DOM-TOM territories for "Moins courants" and "Rarement représentés"
    // For now, route them to the closest main territory projection or metro

    // Saint-Martin (FR-MF): [63.1°W-63.0°W, 18.0°N-18.1°N] → near Guadeloupe
    if (x >= -63.1 && x <= -63.0 && y >= 18.0 && y <= 18.1) {
      return (guadeloupePoint.point(x, y), point)
    }

    // Polynésie française (FR-PF): [154.4°W-134.5°W, -27.9°S--7.7°S] → large area, use guyane projection
    if (x >= -154.4 && x <= -134.5 && y >= -27.9 && y <= -7.7) {
      return (guyanePoint.point(x, y), point)
    }

    // Nouvelle-Calédonie (FR-NC): [163.6°E-167.1°E, -22.7°S--19.5°S] → use reunion projection
    if (x >= 163.6 && x <= 167.1 && y >= -22.7 && y <= -19.5) {
      return (reunionPoint.point(x, y), point)
    }

    // Terres australes (FR-TF): [68.7°E-77.6°E, -49.7°S--37.8°S] → use reunion projection
    if (x >= 68.7 && x <= 77.6 && y >= -49.7 && y <= -37.8) {
      return (reunionPoint.point(x, y), point)
    }

    // Wallis-et-Futuna (FR-WF): [176.1°W-178.2°W, -14.4°S--13.2°S] → use guyane projection
    if (x >= -178.2 && x <= -176.1 && y >= -14.4 && y <= -13.2) {
      return (guyanePoint.point(x, y), point)
    }

    // Saint-Pierre-et-Miquelon (FR-PM): [56.4°W-56.1°W, 46.7°N-47.1°N] → use mayotte projection
    if (x >= -56.4 && x <= -56.1 && y >= 46.7 && y <= 47.1) {
      return (mayottePoint.point(x, y), point)
    }

    // Everything else (including metropolitan France) uses main projection
    return (point = null, metroPoint.point(x, y), point)
  }

  albersFrance.invert = function (coordinates: [number, number]): [number, number] | null {
    const k = metro.scale()
    const t = metro.translate()
    const x = (coordinates[0] - t[0]) / k
    const y = (coordinates[1] - t[1]) / k

    // Determine which region based on screen coordinates
    // (This is simplified - in reality you'd need more precise region detection)
    return (y >= 0.3 && y < 0.5 && x >= -0.4 && x < -0.2
      ? guyane
      : y >= 0.3 && y < 0.5 && x >= 0.2 && x < 0.4
        ? reunion
        : y >= 0.1 && y < 0.3 && x >= -0.4 && x < -0.2
          ? guadeloupe
          : y >= 0.05 && y < 0.15 && x >= -0.4 && x < -0.2
            ? martinique
            : y >= 0.25 && y < 0.4 && x >= 0.15 && x < 0.35
              ? mayotte
              : metro).invert!(coordinates)
  }

  albersFrance.stream = function (stream: any) {
    return (cache && cacheStream === stream)
      ? cache
      : cache = {
        point(x: number, y: number) {
          // Route points to appropriate projection based on geographic coordinates
          const proj = albersFrance([x, y])
          if (proj)
            stream.point(proj[0], proj[1])
        },
        sphere() { stream.sphere() },
        lineStart() { stream.lineStart() },
        lineEnd() { stream.lineEnd() },
        polygonStart() { stream.polygonStart() },
        polygonEnd() { stream.polygonEnd() },
      }
  }

  albersFrance.precision = function (_?: number) {
    if (!arguments.length)
      return metro.precision!()
    metro.precision!(_!)
    guyane.precision!(_!)
    reunion.precision!(_!)
    guadeloupe.precision!(_!)
    martinique.precision!(_!)
    mayotte.precision!(_!)
    return reset()
  }

  albersFrance.scale = function (_?: number) {
    if (!arguments.length)
      return metro.scale()
    metro.scale(_!)
    guyane.scale(_! * 0.25)
    reunion.scale(_! * 0.4)
    guadeloupe.scale(_! * 0.4)
    martinique.scale(_! * 0.4)
    mayotte.scale(_! * 0.4)
    return albersFrance.translate(metro.translate())
  }

  albersFrance.translate = function (_?: [number, number]) {
    if (!arguments.length)
      return metro.translate()
    const k = metro.scale()
    const x = +_![0]
    const y = +_![1]

    // Metropolitan France (main projection) - center area
    // We need to exclude DOM-TOM territories from the main projection
    metroPoint = metro
      .translate(_!)
      .clipExtent([[x - 0.45 * k, y - 0.35 * k], [x + 0.45 * k, y + 0.35 * k]])
      .stream(pointStream)

    // DOM-TOM insets positioned to EXACTLY match Vue Composite positioning
    // Using the same translate values: France center (2, 46) + inset translate offset

    // FR-GF Guyane: translate [-8, -2] -> left and slightly up
    guyanePoint = guyane
      .translate([x - 0.3 * k, y - 0.08 * k]) // Left side, slightly up
      .scale(k * 0.25) // Smaller scale for inset
      .clipExtent([[x - 0.35 * k, y - 0.12 * k], [x - 0.25 * k, y - 0.04 * k]])
      .stream(pointStream)

    // FR-RE Réunion: translate [-10, 3] -> far left and down
    reunionPoint = reunion
      .translate([x - 0.38 * k, y + 0.12 * k]) // Far left, down
      .scale(k * 0.4)
      .clipExtent([[x - 0.43 * k, y + 0.08 * k], [x - 0.33 * k, y + 0.16 * k]])
      .stream(pointStream)

    // FR-GP Guadeloupe: translate [-8, 1] -> left and slightly down
    guadeloupePoint = guadeloupe
      .translate([x - 0.3 * k, y + 0.04 * k]) // Left side, slightly down
      .scale(k * 0.4)
      .clipExtent([[x - 0.35 * k, y + 0.0 * k], [x - 0.25 * k, y + 0.08 * k]])
      .stream(pointStream)

    // FR-MQ Martinique: translate [-8.5, 2.5] -> left and down
    martiniquePoint = martinique
      .translate([x - 0.32 * k, y + 0.1 * k]) // Slightly more left, more down
      .scale(k * 0.4)
      .clipExtent([[x - 0.37 * k, y + 0.06 * k], [x - 0.27 * k, y + 0.14 * k]])
      .stream(pointStream)

    // FR-YT Mayotte: translate [-2, -5] -> slightly left and up
    mayottePoint = mayotte
      .translate([x - 0.08 * k, y - 0.2 * k]) // Slightly left, up
      .scale(k * 0.4)
      .clipExtent([[x - 0.13 * k, y - 0.24 * k], [x - 0.03 * k, y - 0.16 * k]])
      .stream(pointStream)

    return reset()
  }

  albersFrance.fitExtent = function (extent: [[number, number], [number, number]], object: any) {
    // For now, just fit the metro projection
    metro.fitExtent(extent, object)
    albersFrance.translate(metro.translate())
    albersFrance.scale(metro.scale())
    return albersFrance
  }

  albersFrance.fitSize = function (size: [number, number], object: any) {
    // For now, just fit the metro projection
    metro.fitSize(size, object)
    albersFrance.translate(metro.translate())
    albersFrance.scale(metro.scale())
    return albersFrance
  }

  function reset() {
    cache = cacheStream = null
    return albersFrance
  }

  // Initialize with default scale and setup
  albersFrance.scale(2600)
  albersFrance.translate([400, 300])
  return albersFrance
}
