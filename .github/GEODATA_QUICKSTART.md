# Quick Start: Simplified Geographic Data Pipeline

## What We Built

I've created a **Country Polygon Analyzer** tool that automates the tedious manual work of identifying territories in Natural Earth data.

## Try It Now

```bash
# Analyze any country by Natural Earth ID
node scripts/analyze-country.js 620  # Portugal
node scripts/analyze-country.js 250  # France
node scripts/analyze-country.js 724  # Spain
```

### Example Output for Portugal (620):

```
✓ Found: Portugal (ID 620)
✓ Geometry: MultiPolygon with 9 polygon(s)

Polygon Analysis:

Polygon 1:
  Bounds: [-9.48, 37.01] → [-6.21, 42.14]
  Area: 9.23 sq° (LARGEST - MAINLAND)
  Region: Mid-latitude

Polygon 0:
  Bounds: [-17.24, 32.65] → [-16.69, 32.87]
  Area: 0.07 sq°
  Region: Mid-latitude

Polygon 2-8:
  Archipelago (Azores)
  ...

Suggested Configuration:
{
  '620': { code: 'PT-CONT', mainlandPolygon: 1 },
  '620-0': { code: 'PT-20', polygonIndices: [0] },  // Madeira
  '620-1': { code: 'PT-30', polygonIndices: [2, 3, 4, 5, 6, 7, 8] }  // Azores
}
```

## What It Does

1. **Analyzes polygon structure** - Lists all polygons with bounds, areas, centers
2. **Identifies mainland** - Finds the largest polygon automatically
3. **Groups archipelagos** - Clusters nearby polygons (e.g., Azores islands)
4. **Calculates metadata** - Areas, centers, geographic regions
5. **Suggests configuration** - Outputs ready-to-use config structure

## Benefits Over Manual Process

| Before (Manual) | After (Automated) |
|----------------|-------------------|
| Download world data | ✅ Automated |
| Open in QGIS/inspector | ✅ Not needed |
| Manually calculate bounds | ✅ Auto-calculated |
| Guess which polygon is which | ✅ Auto-identified |
| Trial and error | ✅ Instant suggestions |
| **Time: 30-60 min** | **Time: 30 seconds** |

## Next Improvements (See Full Proposal)

The analyzer is Phase 1. See [GEODATA_IMPROVEMENT_PROPOSAL.md](.github/GEODATA_IMPROVEMENT_PROPOSAL.md) for:

- **Polygon indices** instead of bounds (more reliable)
- **Enhanced metadata generation** (auto-calculate centers, offsets)
- **Interactive web mapper** (visual configuration)
- **Unified config format** (single source of truth)
- **Auto-generated TypeScript** definitions

## How to Use for New Country

1. **Find Natural Earth ID**:
   ```bash
   # Search in world data
   node scripts/analyze-country.js 999  # Shows available IDs
   ```

2. **Analyze the country**:
   ```bash
   node scripts/analyze-country.js <ID>
   ```

3. **Copy suggested configuration** to `scripts/configs/[country].js`

4. **Adjust territory names** and codes based on output

5. **Run data generation**:
   ```bash
   node scripts/prepare-geodata.js [country]
   ```

That's it! No more manual inspection or bound calculations.

## Future: One-Command Setup

Vision for Phase 2:

```bash
# Interactive country setup
npm run geodata:add spain

# Prompts:
# ✓ Found: Spain (ID 724) - 3 polygons
# ? Name for polygon 0 (largest): Spain Mainland
# ? Code: ES-MAIN
# ? Name for polygon 1: Canary Islands
# ? Code: ES-CN
# ? Name for polygon 2: Balearic Islands
# ? Code: ES-IB
#
# ✓ Generated configs
# ✓ Generated TypeScript definitions
# ✓ Downloaded and processed data
# ✓ Ready to use!
```

---

**See [GEODATA_IMPROVEMENT_PROPOSAL.md](.github/GEODATA_IMPROVEMENT_PROPOSAL.md) for the complete vision.**
