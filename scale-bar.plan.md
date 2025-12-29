# Scale Bar Feature - Implementation Plan

## Objective
Add a scale bar overlay to map renderings that displays distance reference based on the current projection scale.

## Rationale
- Scale bars provide practical value for understanding map proportions
- More useful than coordinate labels for cartographic work
- Simpler to implement than coordinate labels (removed in graticule simplification)

## Design Considerations

### Scale Bar Behavior
- Display distance in appropriate units (km/miles)
- Adapt to projection scale (larger scale = smaller distance shown)
- Position: bottom-left or bottom-right of map
- Toggle via UI (like graticule, sphere, borders)

### Technical Challenges
1. **Scale varies by location** - Map projections distort scale differently at different latitudes
   - Option A: Show scale at map center (simpler, common approach)
   - Option B: Show scale at equator with "scale varies" note
   - Option C: Multiple scale bars for composite projections

2. **Composite projections** - Each territory has different scale
   - May need territory-specific scale bars or single reference scale

3. **Unit selection** - Kilometers vs miles
   - Could follow locale or add user preference

### UI Integration
- New toggle in DisplayOptionsSection: "Show Scale Bar"
- New state in UI store: `showScaleBar`
- New i18n keys for labels

## Affected Domains
- [ ] UI Store (src/stores/ui.ts) - New showScaleBar state
- [ ] DisplayOptionsSection.vue - New toggle control
- [ ] Rendering services - New ScaleBarService or extension to MapOverlayService
- [ ] Types - ScaleBarConfig if needed
- [ ] i18n - Translation keys

## Implementation Phases

### Phase 1: Core Implementation
- [ ] Add showScaleBar to UI store with persistence
- [ ] Create ScaleBarService with basic rendering
- [ ] Add toggle to DisplayOptionsSection
- [ ] Wire up to MapRenderCoordinator

### Phase 2: Refinement
- [ ] Handle composite projection scale variations
- [ ] Add unit preference (km/mi)
- [ ] Responsive sizing based on map dimensions

## Research Needed
- Review D3 scale bar implementations
- Determine best approach for composite projections
- Decide on visual styling (matches current overlay aesthetic)

## Status
Status: PLANNED
Created: 2026-01-05
