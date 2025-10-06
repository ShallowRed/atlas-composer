/**
 * Portugal Territory Configuration
 * Example configuration for Portugal and autonomous regions
 */

export default {
  name: 'Portugal',
  description: 'Portugal and autonomous regions',

  /**
   * Portuguese territories mapping: Natural Earth ID → Territory metadata
   * IDs from Natural Earth dataset (world-atlas)
   */
  territories: {
    620: { name: 'Portugal', code: 'PT', iso: 'PRT' },
  },

  /**
   * Output filename (without extension)
   * Note: The script will add -territories and -metadata suffixes automatically
   */
  outputName: 'portugal',
}
