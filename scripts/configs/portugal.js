/**
 * Portugal Territory Configuration
 * Portugal includes:
 * - Continental Portugal (mainland)
 * - Madeira (autonomous region, Atlantic)
 * - Azores (autonomous region, 9 islands in the Atlantic)
 *
 * Note: Natural Earth ID 620 includes all Portuguese territories in a MultiPolygon.
 * The mainland needs to be extracted using mainlandBounds, while Madeira and Azores
 * are included as separate polygons.
 */

export default {
  name: 'Portugal',
  description: 'Portugal, Madeira, and Azores',

  /**
   * Portuguese territories mapping: Natural Earth ID → Territory metadata
   * IDs from Natural Earth dataset (world-atlas)
   *
   * Properties:
   * - name, code, iso: Territory metadata
   * - extractFrom: Extract this territory's geometry from parent MultiPolygon
   * - bounds: [[minLon, minLat], [maxLon, maxLat]] - used to match polygons for extraction
   * - mainlandBounds: Used to identify mainland polygons when extracting from MultiPolygon
   */
  territories: {
    // Continental Portugal (will have autonomous regions extracted from it)
    '620': {
      name: 'Portugal Continental',
      code: 'PT-CONT',
      iso: 'PRT',
      // Mainland Portugal bounds (Continental Portugal)
      // Polygon 1: lon [-9.48, -6.21], lat [37.01, 42.14]
      mainlandBounds: [[-10, 36.5], [-6, 42.5]],
    },

    // Autonomous regions - extracted from Portugal (620)
    // These are embedded as polygons in the Portugal MultiPolygon in Natural Earth data
    '620-20': {
      name: 'Madeira',
      code: 'PT-20',
      iso: 'PRT',
      extractFrom: 620,
      // Madeira: Polygon 0, lon [-17.24, -16.69], lat [32.65, 32.87]
      bounds: [[-17.5, 32.5], [-16.5, 33.0]],
    },
    '620-30': {
      name: 'Azores',
      code: 'PT-30',
      iso: 'PRT',
      extractFrom: 620,
      // Azores: Polygons 2-8, lon [-31.28, -25.03], lat [36.94, 39.52]
      bounds: [[-32.0, 36.5], [-24.5, 40.0]],
    },
  },

  /**
   * Output filename (without extension)
   * Note: The script will add -territories and -metadata suffixes automatically
   */
  outputName: 'portugal',
}
