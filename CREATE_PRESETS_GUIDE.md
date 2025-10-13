# Guide: Creating Default Preset Files

## Current Status
✅ All infrastructure is complete and working
❌ Preset JSON files need to be created manually

## What You Need to Do

Create 3 preset files by using the application UI to manually adjust territory positions:

### For Each Atlas (France, Portugal, Spain):

1. **Open the app** at http://localhost:5173/

2. **Load the atlas**
   - Select the atlas from the dropdown (e.g., "France")
   - Switch to "Composite Custom" view mode

3. **Adjust territories**
   - Use the territory controls to position each territory
   - Match the positioning from d3-composite-projections library
   - Adjust scale, translation (x, y) for each territory
   - Goal: Create a visually pleasing default layout

4. **Export the configuration**
   - Click the export button in the UI
   - This will generate a JSON file with the format:
     ```json
     {
       "version": "1.0",
       "metadata": {
         "atlasId": "france",
         "atlasName": "France",
         "exportDate": "2025-01-13T...",
         "createdWith": "0.0.0"
       },
       "pattern": "single-focus",
       "referenceScale": 1000,
       "territories": {
         "metropole": { "projection": "...", "translate": [...], "scale": ... },
         "guadeloupe": { ... },
         ...
       }
     }
     ```

5. **Save the file**
   - Save to: `configs/presets/{atlas-id}-default.json`
   - Example: `configs/presets/france-default.json`

6. **Validate** (optional but recommended)
   ```bash
   pnpm validate:configs
   ```

## Files to Create

- [ ] `configs/presets/france-default.json`
- [ ] `configs/presets/portugal-default.json`
- [ ] `configs/presets/spain-default.json`

## Reference: d3-composite-projections Layouts

You can reference the original d3-composite-projections library for positioning:
- France: https://github.com/rveciana/d3-composite-projections/blob/master/src/conicConformalFrance.js
- Portugal: https://github.com/rveciana/d3-composite-projections/blob/master/src/conicConformalPortugal.js
- Spain: https://github.com/rveciana/d3-composite-projections/blob/master/src/conicConformalSpain.js

## After Creating the Files

Once all 3 preset files are created:

1. **Test loading**
   - Reload the app
   - Switch between atlases
   - Verify that the presets load automatically
   - Check that territories are positioned correctly

2. **Update the plan file**
   - Mark Phase 5 checkboxes as complete
   - Verify all other phases are complete

3. **Final verification**
   ```bash
   pnpm build
   pnpm test
   pnpm validate:configs
   ```

## Notes

- The preset system is already fully integrated and working
- It's just waiting for the preset JSON files to be created
- Once you create the files, they will load automatically on atlas initialization
- The export format is already validated by the schema in `configs/presets/schema.json`
