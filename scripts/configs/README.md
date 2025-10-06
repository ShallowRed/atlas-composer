# Territory Configuration Files

This directory contains configuration files for different territory groups used by the `prepare-geodata.js` script.

## File Structure

Each configuration file exports a default object with the following structure:

```javascript
export default {
  name: 'Territory Name', // Display name
  description: 'Description...', // Brief description
  territories: { // Natural Earth ID mapping
    123: {
      name: 'Territory Name',
      code: 'CODE',
      iso: 'ISO'
    },
    // ... more territories
  },
  outputName: 'base-filename' // Base filename (without suffixes)
  // Script adds -territories and -metadata
}
```

## Available Configurations

- **`france.js`** - France métropolitaine + DOM-TOM (7 territories)
  - Output: `france-territories.json`, `france-metadata.json`
- **`spain.js`** - Spain and autonomous communities (1 territory)
  - Output: `spain-territories.json`, `spain-metadata.json`
- **`eu.js`** - European Union member states (27 countries)
  - Output: `eu-territories.json`, `eu-metadata.json`
- **`portugal.js`** - Portugal (example configuration)
  - Output: `portugal-territories.json`, `portugal-metadata.json`

## Usage

```bash
# Use a specific configuration
node scripts/prepare-geodata.js france
node scripts/prepare-geodata.js spain
node scripts/prepare-geodata.js eu

# With custom resolution
NE_RESOLUTION=10m node scripts/prepare-geodata.js france
```

## Creating a New Configuration

1. Create a new file in this directory (e.g., `portugal.js`)
2. Export a configuration object following the structure above
3. Find Natural Earth IDs at: https://github.com/topojson/world-atlas
4. Run the script with your new config name

Example:

```javascript
// scripts/configs/portugal.js
export default {
  name: 'Portugal',
  description: 'Portugal and autonomous regions',
  territories: {
    620: { name: 'Portugal', code: 'PT', iso: 'PRT' },
  },
  outputName: 'portugal-territories',
}
```

Then run:

```bash
node scripts/prepare-geodata.js portugal
```

## Finding Natural Earth IDs

To find the Natural Earth ID for a country:

1. Visit: https://github.com/topojson/world-atlas
2. Or inspect the downloaded world data in `public/data/world-countries-*.json`
3. Look for the `id` property in the country features
4. The ID corresponds to the ISO 3166-1 numeric code

## Notes

- IDs are taken from the Natural Earth dataset
- Some territories may not be available in lower resolutions
- Overseas territories may have separate IDs from their parent countries
