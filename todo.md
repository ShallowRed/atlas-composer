# TODO List

- Make sure we have a schema for preset, covering all types (unified, split, built-in composite, composite-custom)
- move config schemas to /configs/schemas
- Make sure validate config script actually validate atlas, preset and registry schemas

## Important :
- fix portugal and usa default presets
- add other usa composite projections (e.g. albers usa)
- fix or remove zoom in unified view

## Nice to have :
- improve test coverage (in both direction, make sure we don't miss anything, and remove useless tests)
- new feature : add a zoomed inset in composition
- new feature : a two way converter between d3-composite-projections and json presets
- new feature : usage with mapbox, leaflet, etc.
