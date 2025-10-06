/**
 * France Territory Configuration
 * Includes metropolitan France and all overseas departments/territories (DOM-TOM)
 */

export default {
  name: 'France',
  description: 'France métropolitaine et territoires d\'outre-mer',

  /**
   * French territories mapping: Natural Earth ID → Territory metadata
   * IDs from Natural Earth dataset (world-atlas)
   */
  territories: {
    250: { name: 'France métropolitaine', code: 'FR-MET', iso: 'FRA' },
    666: { name: 'Saint-Pierre-et-Miquelon', code: 'FR-PM', iso: 'SPM' },
    876: { name: 'Wallis-et-Futuna', code: 'FR-WF', iso: 'WLF' },
    258: { name: 'Polynésie française', code: 'FR-PF', iso: 'PYF' },
    540: { name: 'Nouvelle-Calédonie', code: 'FR-NC', iso: 'NCL' },
    260: { name: 'Terres australes françaises', code: 'FR-TF', iso: 'ATF' },
    663: { name: 'Saint-Martin', code: 'FR-MF', iso: 'MAF' },
  },

  /**
   * Output filename (without extension)
   * Note: The script will add -territories and -metadata suffixes automatically
   */
  outputName: 'france',
}
