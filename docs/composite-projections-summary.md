# Custom Composite Projection Parameters - d3-composite-projections Equivalence

## Overview

This document summarizes the alignment between atlas-composer's custom composite projection parameters and d3-composite-projections defaults. All values have been verified to match the corresponding d3-composite-projections v2.0.0 implementation.

## Quick Reference

### Scale Conversion Formula

```
atlas_pixel_offset = d3_normalized_offset × d3_reference_scale
```

Where reference scales are:
- France: 2700
- Portugal: 4200
- Spain: 2700

### Projection Type Mapping

| d3-composite-projections | atlas-composer |
|-------------------------|----------------|
| `conicConformal()`      | `'conic-conformal'` |
| `mercator()`            | `'mercator'` |

## France (`conic-conformal-france`)

### Parameters
- **d3 reference scale**: 2700
- **Main projection**: Conic Conformal
  - Rotation: [-3, -46.2]
  - Parallels: [0, 60]

### Territory Configuration

| Territory | Code | Projection | Scale | Offset (pixels) | d3 Offset (norm) |
|-----------|------|------------|-------|-----------------|------------------|
| Guadeloupe | FR-GP | mercator | 1.4 | [-324, -38] | [-0.12, -0.014] |
| Martinique | FR-MQ | mercator | 1.6 | [-324, 35] | [-0.12, 0.013] |
| Guyane | FR-GF | mercator | 0.6 | [-324, 155] | [-0.12, 0.0575] |
| La Réunion | FR-RE | mercator | 1.2 | [313, -96] | [0.116, -0.0355] |
| Mayotte | FR-YT | mercator | 1.6 | [316, -173] | [0.117, -0.064] |
| Saint-Martin | FR-MF | mercator | 5.0 | [-324, -119] | [-0.12, -0.044] |
| St-Pierre-Miquelon | FR-PM | mercator | 1.3 | [-324, -176] | [-0.12, -0.065] |
| Wallis-et-Futuna | FR-WF | mercator | 2.7 | [313, 59] | [0.116, 0.022] |
| Polynésie française | FR-PF | mercator | 0.5 | [311, 203] | [0.115, 0.075] |
| Polynésie (îles éloignées) | FR-PF-2 | mercator | 0.06 | [297, 122] | [0.11, 0.045] |
| Nouvelle-Calédonie | FR-NC | mercator | 0.3 | [313, -13] | [0.116, -0.0048] |
| TAAF | FR-TF | mercator | 0.1 | [0, 250] | N/A* |

\* FR-TF (TAAF) is not in d3-composite-projections; custom value retained

### Changes Made
- ✅ Fixed FR-MF scale: 2.5 → 5.0

## Portugal (`conic-conformal-portugal`)

### Parameters
- **d3 reference scale**: 4200
- **Main projection**: Conic Conformal
  - Rotation: [10, -39.3]
  - Parallels: [0, 60]

### Territory Configuration

| Territory | Code | Projection | Scale | Offset (pixels) | d3 Offset (norm) |
|-----------|------|------------|-------|-----------------|------------------|
| Madeira | PT-20 | conic-conformal | 1.0 | [-111, 105] | [-0.0265, 0.025] |
| Azores | PT-30 | conic-conformal | 0.6 | [-189, -84] | [-0.045, -0.02] |

### Changes Made
- ✅ Fixed PT-20 offset: [400, -200] → [-111, 105]
- ✅ Fixed PT-20 projection: mercator → conic-conformal
- ✅ Fixed PT-30 offset: [-400, -100] → [-189, -84]
- ✅ Fixed PT-30 scale: 1.0 → 0.6
- ✅ Fixed PT-30 projection: mercator → conic-conformal

## Spain (`conic-conformal-spain`)

### Parameters
- **d3 reference scale**: 2700
- **Main projection**: Conic Conformal
  - Rotation: [5, -38.6]
  - Parallels: [0, 60]

### Territory Configuration

| Territory | Code | Projection | Scale | Offset (pixels) | d3 Offset (norm) |
|-----------|------|------------|-------|-----------------|------------------|
| Balearic Islands | ES-IB | mercator | 1.5 | [150, -50] | N/A* |
| Canary Islands | ES-CN | conic-conformal | 1.0 | [270, -254] | [0.1, -0.094] |

\* ES-IB (Balearic Islands) is not in d3-composite-projections; custom value retained

### Changes Made
- ✅ Fixed ES-CN offset: [-400, 250] → [270, -254]
- ✅ Fixed ES-CN scale: 2.0 → 1.0
- ✅ Fixed ES-CN projection: mercator → conic-conformal

## Configuration Structure

Each atlas now includes a `defaultCompositeConfig` field:

```json
{
  "defaultCompositeConfig": {
    "territoryProjections": {
      "CODE": "projection-type"
    },
    "territoryTranslations": {
      "CODE": { "x": pixelX, "y": pixelY }
    },
    "territoryScales": {
      "CODE": scaleMultiplier
    }
  }
}
```

This configuration:
1. Provides sensible defaults for composite-custom mode
2. Matches d3-composite-projections behavior
3. Can be overridden by users for customization

## Verification

All configurations have been validated:
- ✅ JSON syntax valid
- ✅ Schema conformance verified
- ✅ TypeScript compilation successful
- ✅ Atlas validation successful
- ✅ Parameters match d3-composite-projections v2.0.0

## References

- d3-composite-projections: https://github.com/rveciana/d3-composite-projections
- Implementation details: `docs/composite-projections-mapping.llm.txt`
- Atlas configs: `configs/{france,portugal,spain}.json`
- Schema definition: `configs/schema.json`
