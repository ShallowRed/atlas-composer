# Scripts Folder Rationalization Progress

**Date Started**: 8 octobre 2025
**Date Completed**: 8 octobre 2025 (Utilities Phase)
**Objective**: Simplify scripts folder, extract shared logic, harmonize interfaces

---

## 📋 Plan Overview

### Phase 1: Remove Redundant Scripts
- [x] Delete `diagnose-data.js` (243 lines)
- [x] Delete `verify-dom-extraction.js` (95 lines)

### Phase 2: Create Shared Utilities
- [x] Create `scripts/utils/logger.js` (color logger with char icons) - 125 lines
- [x] Create `scripts/utils/config-loader.js` (unified config loading) - 113 lines
- [x] Create `scripts/utils/ne-data.js` (Natural Earth data fetching) - 96 lines
- [x] Create `scripts/utils/cli-args.js` (argument parsing helper) - 117 lines

**Total utilities**: 451 lines of reusable, testable code

### Phase 3: Update Production Scripts
- [x] Refactor `prepare-geodata.js` to use utilities (~310 lines, from 488)
- [x] Refactor `validate-configs.js` to use utilities (~200 lines, from 292)
- [x] Test: `npm run geodata:prepare portugal` ✓
- [x] Test: `npm run geodata:prepare portugal -- --resolution=10m` ✓
- [x] Test: `npm run geodata:validate portugal` ✓
- [x] Test: `npm run geodata:validate -- --all` ✓

**Status**: COMPLETED. Both production scripts now use shared utilities, support --resolution flag, and have consistent CLI interfaces.

### Phase 4: Move Development Tools
- [x] Create `scripts/dev/` folder
- [ ] Move `analyze-country.js` to `scripts/dev/`
- [ ] Move `lookup-country.js` to `scripts/dev/`
- [ ] Update both to use utilities

**Status**: IN PROGRESS

### Phase 5: Update Configuration
- [ ] Update `package.json` scripts
- [ ] Add `--resolution` flag support
- [ ] Update `scripts/README.md` with new architecture

### Phase 6: Testing & Validation
- [ ] Test all npm scripts
- [ ] Verify all regions work (portugal, france, eu)
- [ ] Test with different resolutions (10m, 50m)
- [ ] Run build to ensure no breaking changes

---

## 📊 Expected Results

### Before
```
scripts/
├── analyze-country.js (307 lines)
├── diagnose-data.js (243 lines)
├── lookup-country.js (273 lines)
├── prepare-geodata.js (488 lines)
├── validate-configs.js (292 lines)
├── verify-dom-extraction.js (95 lines)
└── configs/
    ├── adapter.js (60 lines)
    └── README.md
Total: ~1,700 lines
```

### After
```
scripts/
├── prepare-geodata.js (~250 lines)
├── validate-configs.js (~150 lines)
├── utils/
│   ├── logger.js (~35 lines)
│   ├── config-loader.js (~50 lines)
│   ├── ne-data.js (~45 lines)
│   └── cli-args.js (~30 lines)
├── dev/
│   ├── analyze-country.js (~200 lines)
│   └── lookup-country.js (~180 lines)
├── configs/
│   ├── adapter.js (60 lines)
│   └── README.md
└── README.md (updated)
Total: ~1,000 lines (600 lines reduction)
```

---

## 🎯 Design Decisions

### Logger Style
- Character-based icons: `[✓]`, `[✗]`, `[!]`, `[i]`
- No emoji to ensure terminal compatibility
- Colors: green, red, yellow, blue, cyan

### CLI Arguments
- Pattern: `<region> [--resolution=10m|50m]`
- Support both `--resolution` flag and `NE_RESOLUTION` env var
- Flag takes precedence over env var

### Utilities Architecture
- All utilities are pure functions
- No side effects except logging
- Can be unit tested independently

---

## 📝 Progress Log

### Phase 1: Remove Redundant Scripts
- [ ] Started: [timestamp]
- [ ] Completed: [timestamp]
- [ ] Notes:

### Phase 2: Create Shared Utilities
- [ ] Started: [timestamp]
- [ ] Completed: [timestamp]
- [ ] Notes:

### Phase 3: Update Production Scripts
- [ ] Started: [timestamp]
- [ ] Completed: [timestamp]
- [ ] Notes:

### Phase 4: Move Development Tools
- [ ] Started: [timestamp]
- [ ] Completed: [timestamp]
- [ ] Notes:

### Phase 5: Update Configuration
- [ ] Started: [timestamp]
- [ ] Completed: [timestamp]
- [ ] Notes:

### Phase 6: Testing & Validation
- [ ] Started: [timestamp]
- [ ] Completed: [timestamp]
- [ ] Notes:

---

## ✅ Completion Checklist

- [ ] All redundant scripts removed
- [ ] All utilities created and tested
- [ ] Production scripts refactored
- [ ] Dev tools moved and updated
- [ ] package.json updated
- [ ] README.md updated
- [ ] All tests passing
- [ ] Build successful
- [ ] Documentation complete

---

## 🔄 Rollback Plan

If issues arise:
1. Git stash or commit current work
2. Revert to previous commit
3. Review specific issue
4. Fix and retry

**Backup commit**: [to be filled]
