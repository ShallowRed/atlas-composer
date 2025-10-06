/**
 * European Union Territory Configuration
 * Includes all 27 EU member states
 */

export default {
  name: 'European Union',
  description: 'EU member states (27 countries)',

  /**
   * EU countries mapping: Natural Earth ID → Territory metadata
   * IDs from Natural Earth dataset (world-atlas)
   */
  territories: {
    40: { name: 'Austria', code: 'AT', iso: 'AUT' },
    56: { name: 'Belgium', code: 'BE', iso: 'BEL' },
    100: { name: 'Bulgaria', code: 'BG', iso: 'BGR' },
    191: { name: 'Croatia', code: 'HR', iso: 'HRV' },
    196: { name: 'Cyprus', code: 'CY', iso: 'CYP' },
    203: { name: 'Czech Republic', code: 'CZ', iso: 'CZE' },
    208: { name: 'Denmark', code: 'DK', iso: 'DNK' },
    233: { name: 'Estonia', code: 'EE', iso: 'EST' },
    246: { name: 'Finland', code: 'FI', iso: 'FIN' },
    250: { name: 'France', code: 'FR', iso: 'FRA' },
    276: { name: 'Germany', code: 'DE', iso: 'DEU' },
    300: { name: 'Greece', code: 'GR', iso: 'GRC' },
    348: { name: 'Hungary', code: 'HU', iso: 'HUN' },
    372: { name: 'Ireland', code: 'IE', iso: 'IRL' },
    380: { name: 'Italy', code: 'IT', iso: 'ITA' },
    428: { name: 'Latvia', code: 'LV', iso: 'LVA' },
    440: { name: 'Lithuania', code: 'LT', iso: 'LTU' },
    442: { name: 'Luxembourg', code: 'LU', iso: 'LUX' },
    470: { name: 'Malta', code: 'MT', iso: 'MLT' },
    528: { name: 'Netherlands', code: 'NL', iso: 'NLD' },
    616: { name: 'Poland', code: 'PL', iso: 'POL' },
    620: { name: 'Portugal', code: 'PT', iso: 'PRT' },
    642: { name: 'Romania', code: 'RO', iso: 'ROU' },
    703: { name: 'Slovakia', code: 'SK', iso: 'SVK' },
    705: { name: 'Slovenia', code: 'SI', iso: 'SVN' },
    724: { name: 'Spain', code: 'ES', iso: 'ESP' },
    752: { name: 'Sweden', code: 'SE', iso: 'SWE' },
  },

  /**
   * Output filename (without extension)
   * Note: The script will add -territories and -metadata suffixes automatically
   */
  outputName: 'eu',
}
