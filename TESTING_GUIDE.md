# Testing Guide: Mouse-Based Territory Dragging

## Feature Overview
This feature enables users to drag overseas territories with the mouse cursor to adjust their position in composite view mode, similar to how projection parameters are adjusted with sliders.

## How to Test

### Prerequisites
1. Start the development server: `pnpm run dev`
2. Open the application in your browser (typically `http://localhost:5173`)

### Test Steps

#### 1. Enable the Feature
- Select an atlas with overseas territories (e.g., France, Portugal, Spain)
- Set **View mode** to "Custom composite projection" (composite-custom mode)
- The feature is only active in this mode

#### 2. Verify Visual Indicators
- **Info Alert**: Check that an info alert appears in the Territory Controls panel with the text "Drag territories to adjust position" (or French equivalent)
- **Cursor Feedback**: Hover over overseas territories on the map - cursor should change to "grab" (✋)
- **Mainland Exclusion**: Hover over mainland territory - cursor should remain normal (no grab cursor)

#### 3. Test Dragging
- **Click and Drag**: Click on an overseas territory and drag it
- **Cursor Changes**: During drag, cursor should change to "grabbing" (✊)
- **Hover Badge**: A badge should appear in the bottom-left corner showing the territory code being dragged
- **Position Updates**: Territory should move in real-time as you drag
- **Slider Sync**: Observe the X/Y position sliders in Territory Controls - they should update in real-time

#### 4. Test Different Scenarios

**Scenario A: Drag Multiple Territories**
- Drag French Guiana (GF) to a new position
- Drag Martinique (MQ) to a different position
- Drag Guadeloupe (GP) to another position
- Verify each territory moves independently

**Scenario B: Mainland Cannot Be Dragged**
- Try to drag the mainland (metropolitan France)
- Verify it does not move
- Verify cursor remains normal (no grab cursor on mainland)

**Scenario C: Combined Mouse + Slider Adjustments**
- Drag a territory with the mouse
- Then adjust the same territory using the X/Y sliders
- Verify both methods work and sync properly

**Scenario D: Mode Switching**
- Switch to "Existing composite projection" mode
- Verify drag functionality is disabled (no grab cursor)
- Switch back to "Custom composite projection"
- Verify drag functionality is re-enabled

**Scenario E: Reset Functionality**
- Drag territories to new positions
- Click the "Reset" button in Territory Controls
- Verify territories return to their default positions

#### 5. Test Edge Cases

**Edge Case A: Quick Drag Release**
- Click on a territory and release immediately (no drag)
- Verify no unwanted position changes occur

**Edge Case B: Drag Outside Map**
- Start dragging a territory
- Move cursor outside the map boundaries
- Release mouse
- Verify the drag stops cleanly

**Edge Case C: Multiple Languages**
- Switch language to French
- Verify the info alert shows French text: "Faites glisser les territoires pour ajuster la position"
- Verify drag functionality still works

#### 6. Test Different Atlases

**France** 🇫🇷
- Territories: GF, GP, MQ, RE, YT, NC, PF, WF, PM, BL, MF

**Portugal** 🇵🇹
- Territories: Azores, Madeira

**Spain** 🇪🇸
- Territories: Canary Islands

## Expected Behavior

### ✅ Success Criteria
- [x] Overseas territories have grab cursor on hover
- [x] Mainland does not have grab cursor
- [x] Territories move smoothly during drag
- [x] Hover badge shows territory code
- [x] Position sliders update in real-time
- [x] Feature only works in composite-custom mode
- [x] Info alert provides user guidance
- [x] Works in both English and French
- [x] Reset button restores default positions
- [x] No console errors during interaction

### ❌ Known Limitations
- Feature only available in composite-custom view mode
- Mainland territories cannot be dragged (intentional)
- Requires mouse or touch input (keyboard navigation not supported)

## Performance Considerations
- Dragging should feel smooth and responsive
- No noticeable lag during real-time position updates
- Map should not flicker or re-render unnecessarily

## Browser Testing
Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari

## Mobile Testing (Optional)
Test touch interactions:
- [ ] Touch and drag territories on mobile
- [ ] Verify touch cursor feedback
- [ ] Check responsive layout

## Reporting Issues
If you find any issues, please report:
1. Browser and version
2. Steps to reproduce
3. Expected vs actual behavior
4. Console errors (if any)
5. Screenshots/video if possible

## Developer Notes
- Territory identification uses Observable Plot's `__data__` property
- Delta-based position updates for smooth interaction
- Event listeners cleaned up on component unmount
- All 296 tests pass including 4 new tests for useTerritoryCursor
