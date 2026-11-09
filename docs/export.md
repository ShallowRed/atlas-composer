# Export and import

The application writes a custom composite to a JSON file and reads this file back. Another application draws the same file with `@atlas-composer/projection-loader`. `packages/specification/schemas/` defines the format, and `packages/specification/__tests__/fixtures/valid/minimal.json` is a complete file in this format.

## Export

`ImportControls`, in the controls of the `composite-custom` view, opens `CompositeExportDialog`. The dialog calls `exportConfiguration` of `src/stores/geoData.ts`, which returns a `Result`. Its error is an `ExportError` with the code `EXPORT_NOT_AVAILABLE` when the cartographer has no custom composite or the current atlas has no `compositeProjectionConfig`. The dialog shows the message that `useErrorMessage` gives for this code.

`exportToJSON`, in `src/services/export/composite-export-service.ts`, receives the `CompositeProjection`, the parameter provider of the parameters store, the atlas and the canvas, and builds the file. For each territory:

- `rotate`, `center` and `parallels` are the values that the d3 projection of the territory holds at the time of the export. The file has `parallels` for a conic projection.
- The other projection parameters come from `getExportableParameters`, filtered by `PROJECTION_PARAMETER_KEYS`.
- `projection.id` and `projection.family` come from the definition in `projectionRegistry`. A projection missing from the registry is a programming error, and `exportToJSON` throws an `Error`.
- `translateOffset`, `pixelClipExtent` and `bounds` are rounded to six decimals.

`referenceScale` and `canvasDimensions` are the values of the projection store, or `DEFAULT_REFERENCE_SCALE` and `DEFAULT_CANVAS_DIMENSIONS` when the store has none. `version` is `SPECIFICATION_VERSION`. The downloaded file is named after the atlas, such as `france-projection.json`.

[docs/presets.md](presets.md) describes how to turn an exported file into a preset, and [docs/development.md](development.md) describes the tests of the exported files.

## Import

`ImportModal` works in two steps, and both are actions of `src/stores/composition.ts`.

`readConfigurationFile` runs when the user selects a file. It passes the file to `importFromFile`, in `src/services/export/composite-import-service.ts`. The service requires a name that ends in `.json` and a size of at most 10 MB, parses the text and calls `readCompositeConfig`. Each failure has a code of `ImportError`, in `src/core/types/errors.ts`, and `ImportModal` shows the message that `useErrorMessage` gives for it.

`importConfiguration` applies the file when the user confirms. It sets the view to `composite-custom`, sets the active territories to the territories of the file, writes `referenceScale`, `canvasDimensions` and the parameters of each territory, and resets the graticule, the composition borders and the map limits to their initial values. It then loads the geographic data of the atlas and updates the cartographer. An exception during these steps gives the error `IMPORT_APPLICATION_FAILED`.

## Files of another atlas

The codes of the territories in a file belong to one atlas, so the application refuses a file of another atlas. `checkAtlasCompatibility`, in `src/core/presets/composite-config.ts`, compares `metadata.atlasId` with the id of the current atlas and returns `IMPORT_ATLAS_MISMATCH` with the two ids. `readConfigurationFile` calls it after the file is read, so the user sees the refusal before applying anything. To import this file, the user selects its atlas and opens the file again.

`readConfigurationFile` returns `IMPORT_ATLAS_NOT_LOADED` when the loaded configuration differs from the selected atlas.

## Deprecated forms

`readCompositeConfig`, in `src/core/presets/composite-config.ts`, reads the format of the specification and the forms that earlier versions of the application exported. It rewrites these forms and passes the result to `validateConfig`, which decides whether the file is accepted. Each file of `src/__tests__/fixtures/exports/` holds one of these forms.

- `focusLongitude`, `focusLatitude` and `rotateGamma` become `center` for a cylindrical projection and `rotate` for the other families, through `replaceDeprecatedPositioning` of `src/core/positioning/converters.ts`.
- A `rotateGamma` without the two focus values turns around the target point of the file. When the file gives no position, it turns around the `center` of the territory in the atlas configuration.
- A territory with neither `rotate` nor `center` takes the `center` that the atlas configuration gives to the territory, converted for its family.
- The parameters `projectionId` and `zoomLevel` are removed.
- A `family` outside `PROJECTION_FAMILIES` is replaced by the family of the definition in `projectionRegistry`.
- A `pixelClipExtent` equal to `null` is removed.
- A missing `referenceScale` takes `DEFAULT_REFERENCE_SCALE`, and missing `canvasDimensions` take the dimensions of the current canvas.

A projection id missing from `projectionRegistry` gives the issue `PRESET_PROJECTION_UNKNOWN`, and the import stops.

## Using a file in another application

[packages/projection-loader/README.md](../packages/projection-loader/README.md) describes the installation of `@atlas-composer/projection-loader`, the registration of the projections and the validation. The loader accepts the format of the specification and throws a `ConfigValidationError` for a deprecated form. To use a file in a deprecated form, import it in the application and export it again.
