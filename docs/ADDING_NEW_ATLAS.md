# Adding a New Atlas - Step-by-Step Guide

A comprehensive guide to adding a new atlas to Atlas Composer.

> **📖 Reference Documentation:**
> - [Scripts Documentation](./SCRIPTS.md) - Complete CLI tool reference
> - [Atlas System Documentation](./ATLAS.md) - Architecture and core concepts
> - [Projections Documentation](./PROJECTIONS.md) - Projection system guide

## 📋 Prerequisites

- Node.js 22.12+ and pnpm installed
- Atlas Composer project cloned and dependencies installed
- Basic understanding of JSON format
- Familiarity with Natural Earth data (optional, we'll guide you)

## 🎯 Overview

Adding a new atlas involves **4 simple steps**:

1. **🔍 Research** - Look up Natural Earth data for your country
2. **📝 Configure** - Create a JSON configuration file
3. **🗺️ Generate** - Run the geodata preparation script
4. **✅ Validate** - Verify everything is correct

## Step 1: Research the Geography 🔍

Use the CLI tools to analyze Natural Earth data and understand your country's polygon structure.

### 1.1 Look up the country

Find the Natural Earth feature ID for your country:

```bash
pnpm geodata:lookup "Netherlands"
```

**Example output:**
```
Looking up "Netherlands"
[i] Fetching Natural Earth data (50m)...
Source: https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json
[✓] Loaded 2 object(s) from Natural Earth

Netherlands (ID 528)
  Resolution: 50m
  Geometry: MultiPolygon

Properties
{
  "name": "Netherlands"
}

Polygon Breakdown (12)
  ... (polygon details)

[i] Use 'pnpm geodata:analyze 528' to see detailed polygon analysis
```

**Key information to note:**
- **ID**: `528` - You'll use this in your config
- **Name**: `"Netherlands"` - From properties
- **Geometry**: `MultiPolygon` - Has multiple polygons (mainland + overseas)
- **Polygon count**: `12` - Number of separate polygons to analyze

**Tips:**
- Use partial matching if unsure: `pnpm geodata:lookup "Nether"`
- Some countries have multiple Natural Earth entries (e.g., France, Russia)
- Verify the ID matches your intended country
- The polygon count might indicate overseas territories (but they could also be islands near the mainland)

### 1.2 Analyze polygon structure

Get detailed analysis of all polygons with configuration suggestions:

```bash
pnpm geodata:analyze 528
```

**Example output:**
```
Analyzing country: Netherlands (ID: 528)

[i] Found: Netherlands (ID: 528)
[✓] Geometry: MultiPolygon with 24 polygons

Polygon Analysis:
------------------

Polygon #0:
  Bounds:  [3.36, 50.75] → [7.21, 53.55]
  Center:  [5.28, 52.15]
  Area:    ~12,500 km² (MAINLAND - largest polygon)
  Region:  Europe
  Rings:   1

Polygon #1:
  Bounds:  [-69.99, -69.84] → [12.41, 12.63]
  Center:  [-69.92, 12.52]
  Area:    ~45 km²
  Region:  Caribbean
  Rings:   1

Polygon #2:
  Bounds:  [-69.16, -68.74] → [12.01, 12.39]
  Center:  [-68.95, 12.20]
  Area:    ~120 km²
  Region:  Caribbean
  Rings:   1

... (more polygons)

Configuration Suggestion (using polygonIndices):
-------------------------------------------------

{
  "id": "528",
  "code": "NL-MET",
  "name": "Netherlands (European)",
  "role": "mainland"
  // Use mainlandPolygon: 0 to keep just the mainland
}

{
  "id": "528-1",
  "code": "NL-AW",
  "name": "Aruba",
  "role": "overseas",
  "extraction": {
    "extractFrom": "528",
    "polygonIndices": [1]
  }
}

{
  "id": "528-2",
  "code": "NL-CW",
  "name": "Curaçao",
  "role": "overseas",
  "extraction": {
    "extractFrom": "528",
    "polygonIndices": [2]
  }
}
```

**What this tells you:**

| Info | What to Do |
|------|-----------|
| Polygon #0 (largest) | This is probably your mainland - use `mainlandPolygon: 0` or `polygonIndices: [0]` |
| Other polygons | Overseas territories - use their indices in `polygonIndices` |
| Region info | Helps you organize territories geographically |
| Polygon index | Zero-based index (0, 1, 2, ...) for `polygonIndices` |

**Pro tips:**
- 📋 Copy the entire output to a text file for reference
- 🎯 Polygon indices are **zero-based** (0, 1, 2, ...) - unlike Natural Earth IDs
- 📍 Use the exact polygon indices from the output
- 🌍 Check a map if territory names are unclear

---

## Step 2: Create JSON Configuration 📝

Create a new JSON file in the `configs/` directory.

### 2.1 Create the config file

```bash
# Create the file
touch configs/netherlands.json

# Open in your editor
code configs/netherlands.json
```

### 2.2 Basic structure

Start with this template:

```json
{
  "$schema": "./schema.json",
  "id": "netherlands",
  "name": "Netherlands",
  "description": "Netherlands with Caribbean territories",

  "projectionPreferences": {
    "recommended": ["conic-conformal", "albers", "mercator"],
    "default": {
      "mainland": "conic-conformal",
      "overseas": "mercator"
    },
    "prohibited": [
      "gnomonic",
      "orthographic",
      "conic-conformal-france",
      "conic-confable-portugal",
      "conic-conformal-europe"
    ]
  },

  "territories": [],

  "projection": {
    "center": { "longitude": 5.3, "latitude": 52.2 },
    "rotate": {
      "mainland": [-5.3, 0],
      "azimuthal": [-5.3, -52.2]
    },
    "parallels": {
      "conic": [51.0, 53.5]
    }
  }
}
```

### 2.3 Add the mainland territory

Copy info from the `analyze` output for polygon #0 (largest):

```json
{
  "territories": [
    {
      "id": "528",
      "role": "primary",
      "code": "NL-MET",
      "name": "Netherlands (European)",
      "shortName": "Nederland",
      "iso": "NLD",
      "center": [5.29, 52.13],
      "bounds": [[3.36, 50.75], [7.21, 53.55]],
      "extraction": {
        "mainlandPolygon": 0
      },
      "rendering": {
        "offset": [0, 0],
        "projectionType": "conic-conformal",
        "parallels": [51.0, 53.5]
      }
    }
  ]
}
```

**Field guide:**

| Field | Source | Notes |
|-------|--------|-------|
| `id` | Natural Earth ID from lookup | "528" |
| `role` | Always "primary" for main territory | Fixed value |
| `code` | Your choice - ISO + suffix | "NL-MET" (NL = ISO, MET = Metropolitan) |
| `name` | Full display name | "Netherlands (European)" |
| `shortName` | Short display name (optional) | "Nederland" |
| `iso` | ISO 3166-1 alpha-3 code | "NLD" from lookup |
| `center` | From analyze output | Exact values `[lon, lat]` |
| `bounds` | From analyze output | `[[minLon, minLat], [maxLon, maxLat]]` (nested arrays) |
| `extraction.mainlandPolygon` | Polygon index from analyze | `0` for the main/largest polygon |
| `rendering.offset` | Visual position in composite view | `[0, 0]` for primary territory (no offset) |
| `rendering.projectionType` | Projection for this territory | From `projectionPreferences.default.mainland` |
| `rendering.parallels` | Conic projection parallels | `[southParallel, northParallel]` for your latitude range |

### 2.4 Add secondary territories

For each secondary (overseas) territory, use the polygon index from `analyze` output:

```json
{
  "territories": [
    // ... primary territory
    {
      "id": "528-1",
      "role": "secondary",
      "code": "NL-AW",
      "name": "Aruba",
      "iso": "ABW",
      "region": "Caribbean",
      "center": [-69.92, 12.52],
      "bounds": [[-69.99, 12.41], [-69.84, 12.63]],
      "extraction": {
        "extractFrom": "528",
        "polygonIndices": [1]
      },
      "rendering": {
        "offset": [-300, -150],
        "baseScaleMultiplier": 2.5
      }
    },
    {
      "id": "528-2",
      "role": "overseas",
      "code": "NL-CW",
      "name": "Curaçao",
      "iso": "CUW",
      "region": "Caribbean",
      "center": [-68.95, 12.20],
      "bounds": [[-69.16, 12.01], [-68.74, 12.39]],
      "extraction": {
        "extractFrom": "528",
        "polygonIndices": [2]
      },
      "rendering": {
        "offset": [-250, -50],
        "baseScaleMultiplier": 2.5
      }
    }
  ]
}
```

**Field guide for secondary territories:**

| Field | Source | Notes |
|-------|--------|-------|
| `id` | Parent ID + suffix | "528-1" (parent ID + sequential number) |
| `role` | "secondary" for distant territories | Or "member" for equal-members atlases (EU, world) |
| `code` | Your choice - ISO + suffix | "NL-AW" (NL-AWE, NL-CUR, etc.) |
| `region` | Geographic region | "Caribbean", "Pacific", "Indian Ocean", etc. |
| `extraction.extractFrom` | Parent Natural Earth ID | "528" (the parent country ID) |
| `extraction.polygonIndices` | Array of polygon indices | `[1]` for single polygon, `[1, 2, 3]` for archipelago |
| `rendering.offset` | Position in composite view | `[x, y]` - adjust after first render |
| `rendering.baseScaleMultiplier` | Make small islands visible | 1.5-3.0 for small islands |

### 2.5 Understanding extraction methods

**Method 1: Keep primary territory only (removes all other polygons)**

```json
{
  "extraction": {
    "mainlandPolygon": 0
  }
}
```
*Use this for primary territories to filter out islands and secondary polygons*

**Method 2: Extract specific polygon(s) by index**

```json
{
  "extraction": {
    "extractFrom": "528",
    "polygonIndices": [1]
  }
}
```
*Use this for secondary territories when you know the polygon index*

### 2.6 Add territory modes (optional but recommended)

Create convenient territory groupings for users:

```json
{
  "modes": [
    {
      "id": "all-territories",
      "label": "All territories",
      "territories": ["NL-MET", "NL-AW", "NL-CW", "NL-SX", "NL-BQ"]
    },
    {
      "id": "mainland-only",
      "label": "Mainland only",
      "territories": ["NL-MET"]
    },
    {
      "id": "caribbean",
      "label": "Caribbean territories",
      "territories": ["NL-AW", "NL-CW", "NL-SX", "NL-BQ"]
    }
  ]
}
```

### 2.7 Projection preferences explained

```json
{
  "projectionPreferences": {
    "recommended": [
      "conic-conformal", // Best for mid-latitudes (30°-60°)
      "albers", // Equal-area alternative
      "mercator" // For tropical/equatorial regions
    ],
    "default": {
      "mainland": "conic-conformal", // Used by default for mainland
      "overseas": "mercator" // Used by default for overseas territories
    },
    "prohibited": [
      "gnomous", // Doesn't work well for this region
      "orthographic", // Not suitable
      "conic-confable-france", // Other atlas composites
      "conic-confable-portugal",
      "conic-confable-europe"
    ]
  }
}
```

**Key rules:**
- ✅ **ALWAYS prohibit other atlas composites** (`conic-confable-france`, `conic-confable-portugal`, `conic-confable-europe`)
- ✅ Use `conic-confable` for mid-latitudes (30°-60°)
- ✅ Use `mercator` or `azimuthal-equal-area` for equatorial regions (±30°)
- ✅ Use `azimuthal-equal-area` or `stereographic` for polar regions (>60°)

---

## Step 3: Generate Geographic Data 🗺️

Run the geodata preparation script to extract territories and create optimized files.

### 3.1 Prepare the data

```bash
pnpm geodata:prepare netherlands
```

**What it does:**
1. ⬇️ Downloads Natural Earth world data (if not cached)
2. 🔍 Loads your configuration from `configs/netherlands.json`
3. ✂️ Extracts mainland polygon (using `mainlandPolygon`)
4. ✂️ Extracts overseas territories (using `polygonIndices` or `polygonBounds`)
5. 📦 Converts to optimized TopoJSON format
6. 📄 Generates metadata file with territory information
7. 💾 Saves files to `src/public/data/`

**Console output:**
```
[i] Loading configuration: netherlands
[✓] Config loaded and validated

[i] Fetching Natural Earth data (50m resolution)...
[✓] World data loaded (cached)

[i] Processing territories...
[✓] Found Natural Earth feature: 528 (Netherlands)
[i] Extracting primary territory (polygon #0)
[i] Extracting secondary territory: NL-AW (polygon #1)
[i] Extracting secondary territory: NL-CW (polygon #2)

[✓] Generated netherlands-territories-50m.json (243 KB)
[✓] Generated netherlands-metadata-50m.json (8 KB)

[✓] Success! Generated 2 files in src/public/data/
```

**Output files:**
```
src/public/data/
├── world-countries-50m.json              # Cached Natural Earth data (reused)
├── netherlands-territories-50m.json      # Territory geometries (NEW)
└── netherlands-metadata-50m.json          # Territory metadata (NEW)
```

### 3.2 Resolution options

```bash
# High detail (production)
pnpm geodata:prepare netherlands --resolution=10m

# Medium detail (default, recommended for development)
pnpm geodata:prepare netherlands --resolution=50m

# Low detail (testing only)
pnpm geodata:prepare netherlands --resolution=110m
```

**Resolution comparison:**

| Resolution | Detail | File Size | Use Case |
|------------|--------|-----------|----------|
| 10m | High | ~800 KB | Production, final maps |
| 50m | Medium | ~200 KB | Development (default) |
| 110m | Low | ~50 KB | Quick testing only |

**Recommendation:** Start with 50m for development, upgrade to 10m for production.

### 3.3 Verify generated files

```bash
ls -lh src/public/data/netherlands-*
```

**Expected output:**
```
-rw-r--r--  netherlands-metadata-50m.json     (5-10 KB)
-rw-r--r--  netherlands-territories-50m.json  (150-300 KB)
```

**File contents:**

**Metadata file** (JSON, human-readable):
```json
{
  "name": "Netherlands",
  "description": "Netherlands with Caribbean territories",
  "territories": {
    "NL-MET": {
      "name": "Netherlands (European)",
      "code": "NL-MET",
      "iso": "NLD"
    },
    "NL-AW": {
      "name": "Aruba",
      "code": "NL-AW",
      "iso": "ABW"
    }
  },
  "count": 5
}
```

**Territories file** (TopoJSON, optimized):
```json
{
  "type": "Topology",
  "objects": {
    "territories": {
      "type": "GeometryCollection",
      "geometries": [
        {
          "type": "MultiPolygon",
          "id": "528",
          "properties": { "code": "NL-MET", "name": "Netherlands (European)" }
        }
      ]
    }
  },
  "arcs": [...],
  "transform": {...}
}
```

## Step 4: Validate Configuration ✅

Verify that your configuration matches the generated data.

### 4.1 Run validation

```bash
pnpm geodata:validate netherlands
```

**Success output:**
```
[i] Validating: netherlands

[✓] Config loaded: 5 territories defined
[✓] Geodata file found: netherlands-territories-50m.json
[✓] Metadata file found: netherlands-metadata-50m.json

[✓] Territory count matches: 5 territories
[✓] All territory codes match

[✓] VALID - Config and data are in sync
```

**What it validates:**

| Check | Description | If it fails |
|-------|-------------|-------------|
| Config exists | JSON file exists in `configs/` | Create the config file |
| Data files exist | TopoJSON and metadata exist in `src/public/data/` | Run `pnpm geodata:prepare` |
| Territory count | Same number of territories in config and data | Check extraction rules |
| Territory codes | All codes in config exist in data | Fix typos in codes |
| No orphans | No extra territories in data without config | Remove extras or add to config |

### 4.2 Common validation errors

**Error: Territory missing from data**

```
[✗] Territory "NL-BQ" defined in config but not found in generated data
```

**Cause:** Polygon index is wrong, or territory doesn't exist in Natural Earth

**Solution:**
```bash
# Re-run analyze to check polygon indices
pnpm geodata:analyze 528

# Verify the polygon index for NL-BQ
# Update config with correct polygonIndices
# Re-generate data
pnpm geodata:prepare netherlands
```

**Error: Territory count mismatch**

```
[✗] Config has 5 territories, but data has 4 territories
```

**Cause:** One territory failed to extract (wrong index or bounds)

**Solution:**
```bash
# Check the geodata:prepare output for errors
pnpm geodata:prepare netherlands

# Look for error messages like:
# [✗] Polygon index 5 not found in feature 528

# Fix the polygonIndices in your config
# Re-run prepare
```

**Error: Extra territory in data**

```
[✗] Territory "NL-UNKNOWN" found in data but not in config
```

**Cause:** Typo in territory code, or old data from previous run

**Solution:**
```bash
# Check for typos in territory codes in config
# Re-generate data to ensure clean slate
pnpm geodata:prepare netherlands
```

### 4.3 Validate all atlases

```bash
pnpm geodata:validate --all
```

**Output:**
```
[i] Validating all atlases...

[✓] france (13 territories)
[✓] portugal (3 territories)
[✓] netherlands (5 territories)
[✓] eu (32 territories)

[✓] All atlases are valid
```

Use this after making changes to ensure you didn't break existing atlases.

## Step 5: Test the Atlas 🧪

Your atlas is automatically discovered - no code changes needed!

### 5.1 Start development server

```bash
pnpm dev
```

**Console output:**
```
[i] Vite dev server starting...
[i] Loading atlas configurations...
[✓] Loaded: france, portugal, netherlands, eu
[✓] 4 atlas(es) registered

[✓] Ready in 542ms
[i] Local: http://localhost:5173
```

✅ Your atlas appears in the console!

### 5.2 Test in browser

1. Open http://localhost:5173
2. Open the atlas dropdown (top of page)
3. Select "Netherlands" ✓
4. Verify all territories appear on map
5. Switch between view modes (Split, Composite, Unified)
6. Check projections dropdown (should show recommended ones first)
7. Test territory positioning controls

**What to check:**

| Feature | Test | Expected Result |
|---------|------|----------------|
| Atlas appears | Dropdown | "Netherlands" in list |
| Territories render | Map | All 5 territories visible |
| Split view | Mode switcher | Mainland + overseas side-by-side |
| Composite view | Mode switcher | All territories in custom positions |
| Projections | Projection dropdown | Recommended ones at top, prohibited ones hidden |
| Territory controls | Position sliders | Can adjust X/Y offset and scale |

### 5.3 Adjust territory positioning

If territories overlap or are poorly positioned in composite view:

1. Note the current offset values
2. Edit `configs/netherlands.json`
3. Update `rendering.offset` for territories:

```json
{
  "id": "528-1",
  "code": "NL-AW",
  "name": "Aruba",
  "rendering": {
    "offset": [-300, -150], // [x, y] - adjust these values
    "baseScaleMultiplier": 2.5
  }
}
```

4. Save the file
5. Refresh browser (Vite hot-reload) OR re-run `pnpm geodata:prepare netherlands`
6. Repeat until positions look good

**Offset tips:**
- Negative X = left, Positive X = right
- Negative Y = up, Positive Y = down
- Start with rough positions (±50, ±100), then fine-tune
- `baseScaleMultiplier` makes small islands more visible (1.5-3.0)

### 5.4 Debug common issues

**Issue: Atlas not in dropdown**

**Check browser console:**
```
Config validation error: Invalid JSON in configs/netherlands.json
```

**Solution:**
```bash
# Validate JSON syntax
cat configs/netherlands.json | python -m json.tool

# Or use online JSON validator
# Fix syntax errors (missing commas, quotes, brackets)
```

**Issue: Territories not rendering**

**Check browser console:**
```
GET http://localhost:5173/data/netherlands-territories-50m.json 404 (Not Found)
```

**Solution:**
```bash
# Files missing or in wrong location
ls src/public/data/netherlands-*

# If missing, re-generate
pnpm geodata:prepare netherlands
```

---

**Issue: Wrong projections shown**

**Check:** `projectionPreferences.recommended` in config

**Solution:**
```json
{
  "projectionPreferences": {
    "recommended": ["conic-confable", "albers", "mercator"]
  }
}
```

**Issue: Territory appears as blank/empty**

**Cause:** Wrong polygon index, or polygon doesn't exist

**Solution:**
```bash
# Re-check polygon indices
pnpm geodata:analyze 528

# Verify the polygon index in your config matches
# Update config with correct index
# Re-generate data
pnpm geodata:prepare netherlands
```

---

## Complete Examples 📚

### Example 1: Traditional Atlas (Netherlands)

**Pattern:** 1 mainland + N overseas territories

```json
{
  "$schema": "./schema.json",
  "id": "netherlands",
  "name": "Netherlands",
  "description": "Netherlands with Caribbean territories",

  "projectionPreferences": {
    "recommended": ["conic-confable", "albers", "mercator"],
    "default": {
      "mainland": "conic-confable",
      "overseas": "mercator"
    },
    "prohibited": [
      "gnomous",
      "orthographic",
      "conic-confable-france",
      "conic-confable-portugal",
      "conic-confable-europe"
    ]
  },

  "territories": [
    {
      "id": "528",
      "role": "mainland",
      "code": "NL-MET",
      "name": "Netherlands (European)",
      "shortName": "Nederland",
      "iso": "NLD",
      "center": [5.28, 52.15],
      "bounds": [[3.36, 50.75], [7.21, 53.55]],
      "extraction": {
        "mainlandPolygon": 0
      },
      "rendering": {
        "offset": [0, 0],
        "projectionType": "conic-confable",
        "parallels": [51.0, 53.5]
      }
    },
    {
      "id": "528-1",
      "role": "overseas",
      "code": "NL-AW",
      "name": "Aruba",
      "iso": "ABW",
      "region": "Caribbean",
      "center": [-69.92, 12.52],
      "bounds": [[-69.99, 12.41], [-69.84, 12.63]],
      "extraction": {
        "extractFrom": "528",
        "polygonIndices": [1]
      },
      "rendering": {
        "offset": [-300, -150],
        "baseScaleMultiplier": 2.5
      }
    },
    {
      "id": "528-2",
      "role": "overseas",
      "code": "NL-CW",
      "name": "Curaçao",
      "iso": "CUW",
      "region": "Caribbean",
      "center": [-68.95, 12.20],
      "bounds": [[-69.16, 12.01], [-68.74, 12.39]],
      "extraction": {
        "extractFrom": "528",
        "polygonIndices": [2]
      },
      "rendering": {
        "offset": [-250, -50],
        "baseScaleMultiplier": 2.5
      }
    }
  ],

  "projection": {
    "center": { "longitude": 5.3, "latitude": 52.2 },
    "rotate": {
      "mainland": [-5.3, 0],
      "azimuthal": [-5.3, -52.2]
    },
    "parallels": {
      "conic": [51.0, 53.5]
    }
  },

  "modes": [
    {
      "id": "all-territories",
      "label": "All territories",
      "territories": ["NL-MET", "NL-AW", "NL-CW", "NL-SX", "NL-BQ"]
    },
    {
      "id": "caribbean-only",
      "label": "Caribbean territories",
      "territories": ["NL-AW", "NL-CW", "NL-SX", "NL-BQ"]
    }
  ]
}
```

### Example 2: Multi-Mainland Atlas (Benelux)

**Pattern:** N equal member states (no single "mainland")

```json
{
  "$schema": "./schema.json",
  "id": "benelux",
  "name": "Benelux",
  "description": "Belgium, Netherlands, and Luxembourg",

  "viewModes": ["composite-custom", "unified"],
  "defaultViewMode": "unified",

  "projectionPreferences": {
    "recommended": ["conic-confable", "albers"],
    "default": {
      "mainland": "conic-confable",
      "overseas": "mercator"
    },
    "prohibited": ["gnomous", "orthographic"]
  },

  "territories": [
    {
      "id": "56",
      "role": "member-state",
      "code": "BE",
      "name": "Belgium",
      "iso": "BEL",
      "center": [4.5, 50.5],
      "bounds": [[2.5, 49.5], [6.4, 51.5]],
      "extraction": {
        "mainlandPolygon": 0
      }
    },
    {
      "id": "528",
      "role": "member-state",
      "code": "NL",
      "name": "Netherlands",
      "iso": "NLD",
      "center": [5.3, 52.2],
      "bounds": [[3.36, 50.75], [7.21, 53.55]],
      "extraction": {
        "mainlandPolygon": 0
      }
    },
    {
      "id": "442",
      "role": "member-state",
      "code": "LU",
      "name": "Luxembourg",
      "iso": "LUX",
      "center": [6.1, 49.8],
      "bounds": [[5.7, 49.4], [6.5, 50.2]],
      "extraction": {
        "mainlandPolygon": 0
      }
    }
  ],

  "projection": {
    "center": { "longitude": 5.5, "latitude": 51.0 },
    "rotate": {
      "mainland": [-5.5, 0],
      "azimuthal": [-5.5, -51.0]
    },
    "parallels": {
      "conic": [50.0, 52.5]
    }
  }
}
```

**Note:** Multi-mainland atlases use `"role": "member-state"` instead of `"mainland"`.

---

## Quick Reference 📖

### Territory Roles

| Role | Use Case | Example |
|------|----------|---------|
| `mainland` | Main territory (single) | France Métropole, Portugal Continental |
| `overseas` | Distant territory | Martinique, Azores |
| `island` | Island territory | Corsica |
| `archipelago` | Island group | French Polynesia (multiple polygons) |
| `embedded` | Enclave/exclave | Monaco (within France) |
| `member-state` | Equal member (multi-mainland) | EU countries, ASEAN members |

### Extraction Methods

| Method | Config | When to Use |
|--------|--------|-------------|
| Keep mainland only | `{"mainlandPolygon": 0}` | Remove overseas polygons from parent feature |
| Extract by index | `{"extractFrom": "528", "polygonIndices": [1]}` | Extract specific polygon(s) from parent (RECOMMENDED) |
| Extract by bounds | `{"extractFrom": "528", "polygonBounds": [[w,s],[e,n]]}` | When you only know geographic coordinates |

### View Modes

| Mode | Description | Best For |
|------|-------------|----------|
| `split` | Separate maps (mainland + overseas) | Traditional atlases with distant territories |
| `composite-existing` | Pre-built D3 composite projection | France, Portugal, Spain (if available) |
| `composite-custom` | Custom layout (user-adjustable) | Any atlas - most flexible (DEFAULT) |
| `unified` | Single world map | Regional groups, geographic context |

### Projections by Region

| Latitude Range | Region | Recommended Projections |
|----------------|--------|------------------------|
| 60°+ | Polar | `azimuthal-equal-area`, `stereographic` |
| 30°-60° | Mid-latitudes | `conic-confable`, `albers`, `conic-equal-area` |
| ±30° | Equatorial/Tropical | `mercator`, `equirectangular` |
| Global | World maps | `natural-earth`, `robinson`, `mollweide` |

## Troubleshooting 🔧

### Data Generation Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Country not found | Typo or wrong ID | Use `pnpm geodata:lookup <name>` to find correct ID |
| Territory missing | Wrong polygon index | Re-run `pnpm geodata:analyze <id>`, use correct index |
| Empty geometry | Invalid polygon index | Polygon index doesn't exist - check analyze output |
| Extraction failed | Wrong field format | Use `polygonIndices: [0]` (array), not `polygonIndex: 0` |

### Validation Issues

| Problem | Cause | Solution |
|---------|-------|---|
| Count mismatch | Territory failed to extract | Check `geodata:prepare` console for errors |
| Code mismatch | Typo in territory code | Fix `code` field in config, re-generate |
| Missing territory | Config error | Verify `extraction` fields are correct |

### Runtime Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Atlas not appearing | JSON syntax error | Validate JSON: `cat config.json \| python -m.tool` |
| 404 on data files | Files not generated | Run `pnpm geodata:prepare <atlas>` |
| Wrong projections | Bad preferences | Update `projectionPreferences.recommended` |
| Territories overlap | Bad offsets | Adjust `rendering.offset` values |
| Territory blank/empty | Wrong polygon index | Check `polygonIndices`, re-run analyze |

## Best Practices ✅

### ✅ DO

- ✅ Use `pnpm geodata:analyze` to get accurate polygon indices
- ✅ Use `polygonIndices` for extraction (most reliable method)
- ✅ Add other atlas composites to `prohibited` list
- ✅ Test with all view modes before committing
- ✅ Run validation after every data generation
- ✅ Use ISO-based territory codes (e.g., `NL-AW`, `FR-GP`)
- ✅ Add `region` field for overseas territories
- ✅ Create `modes` for common territory selections
- ✅ Start with 50m resolution, upgrade to 10m later

### ❌ DON'T

- ❌ Manually edit generated TopoJSON files
- ❌ Guess polygon indices - use `geodata:analyze`
- ❌ Forget to run validation after changes
- ❌ Use spaces in `id` field (use kebab-case: `"new-zealand"`)
- ❌ Mix `member-state` with `mainland` role in same atlas
- ❌ Omit `projectionPreferences` (makes projection selection worse)
- ❌ Use `polygonIndex` (singular) - it's `polygonIndices` (plural, array)
- ❌ Forget to add other atlas composites to `prohibited`

## Next Steps 🚀

Once your atlas is working:

1. **📊 Add high-resolution data**: Run with `--resolution=10m`
2. **🌐 Add translations**: Update `src/i18n/locales/*.json`
3. **🎨 Optimize positioning**: Fine-tune territory offsets and scales
4. **📋 Add more modes**: Create useful territory groupings
5. **📝 Document specifics**: Add notes about special territories
6. **🧪 Test extensively**: Try all view modes and projections
7. **🤝 Contribute**: Submit a pull request!

## Need Help? 💬

- 📖 [Atlas System Documentation](./ATLASES.md) - Architecture and API reference
- 📖 [Scripts Documentation](./SCRIPTS.md) - Complete CLI tool reference
- 📖 [Projections Documentation](./PROJECTIONS.md) - Projection system guide
- 🐛 [Open an Issue](https://github.com/ShallowRed/atlas-composer/issues) - Report bugs
- 💡 [Discussions](https://github.com/ShallowRed/atlas-composer/discussions) - Ask questions

**Happy Mapping! 🗺️**
