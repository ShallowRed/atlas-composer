/**
 * France Territory Configuration
 * Includes metropolitan France and all overseas departments/territories (territoires ultramarins)
 */

export default {
  name: 'France',
  description: 'France métropolitaine et territoires d\'outre-mer',

  /**
   * French territories mapping: Natural Earth ID → Territory metadata
   * IDs from Natural Earth dataset (world-atlas)
   *
   * Properties:
   * - name, code, iso: Territory metadata
   * - extractFrom: Extract this territory's geometry from parent MultiPolygon (for DOM)
   * - bounds: [[minLon, minLat], [maxLon, maxLat]] - used to match polygons for extraction
   * - duplicateFrom: Create duplicate geometry from source territory (for multiple projections)
   */
  territories: {
    // Metropolitan France (will have DOM extracted from it)
    '250': { name: 'France métropolitaine', code: 'FR-MET', iso: 'FRA' },

    // Overseas departments (départements d'outre-mer) - extracted from France (250)
    // These are embedded as polygons in the France MultiPolygon in Natural Earth data
    '250-GP': {
      name: 'Guadeloupe',
      code: 'FR-GP',
      iso: 'GLP',
      extractFrom: 250,
      bounds: [[-61.81, 15.83], [-61.0, 16.51]],
    },
    '250-MQ': {
      name: 'Martinique',
      code: 'FR-MQ',
      iso: 'MTQ',
      extractFrom: 250,
      bounds: [[-61.23, 14.39], [-60.81, 14.88]],
    },
    '250-GF': {
      name: 'Guyane',
      code: 'FR-GF',
      iso: 'GUF',
      extractFrom: 250,
      bounds: [[-54.61, 2.11], [-51.64, 5.75]],
    },
    '250-RE': {
      name: 'La Réunion',
      code: 'FR-RE',
      iso: 'REU',
      extractFrom: 250,
      bounds: [[55.22, -21.39], [55.84, -20.87]],
    },
    '250-YT': {
      name: 'Mayotte',
      code: 'FR-YT',
      iso: 'MYT',
      extractFrom: 250,
      bounds: [[45.04, -13.0], [45.3, -12.64]],
    },

    // Other overseas territories (collectivités d'outre-mer)
    '666': { name: 'Saint-Pierre-et-Miquelon', code: 'FR-PM', iso: 'SPM' },
    '876': { name: 'Wallis-et-Futuna', code: 'FR-WF', iso: 'WLF' },
    '258': { name: 'Polynésie française', code: 'FR-PF', iso: 'PYF' },
    '540': { name: 'Nouvelle-Calédonie', code: 'FR-NC', iso: 'NCL' },
    '260': { name: 'Terres australes françaises', code: 'FR-TF', iso: 'ATF' },
    '663': { name: 'Saint-Martin', code: 'FR-MF', iso: 'MAF' },

    // Duplicate projection for remote Polynesian islands
    // Uses same geometry as FR-PF but with different projection scale
    '258-2': {
      name: 'Polynésie française (îles éloignées)',
      code: 'FR-PF-2',
      iso: 'PYF',
      duplicateFrom: 258,
    },
  },

  /**
   * Output filename (without extension)
   * Note: The script will add -territories and -metadata suffixes automatically
   */
  outputName: 'france',
}
