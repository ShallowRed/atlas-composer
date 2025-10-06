/**
 * Spain Territory Configuration
 * Includes Spain and autonomous communities
 */

export default {
  name: 'Spain',
  description: 'Spain and autonomous communities',

  /**
   * Spanish territories mapping: Natural Earth ID → Territory metadata
   * IDs from Natural Earth dataset (world-atlas)
   */
  territories: {
    724: { name: 'Spain', code: 'ES', iso: 'ESP' },
  },

  /**
   * Output filename (without extension)
   * Note: The script will add -territories and -metadata suffixes automatically
   */
  outputName: 'spain',
}
