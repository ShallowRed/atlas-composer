/**
 * ClipExtent Format Conversion Utility
 *
 * Converts legacy normalized clipExtent coordinates to new pixel-based format
 * relative to translateOffset.
 */

/**
 * Convert legacy normalized clipExtent to pixel-based clipExtent
 *
 * @param normalizedClipExtent - Legacy format: [[x1, y1], [x2, y2]] in normalized coords (-1 to 1)
 * @param referenceScale - Reference scale (default: 2700)
 * @returns Pixel-based clipExtent relative to translateOffset
 */
export function convertClipExtentToPixels(
  normalizedClipExtent: [[number, number], [number, number]],
  referenceScale: number = 2700,
): [[number, number], [number, number]] {
  const [[x1, y1], [x2, y2]] = normalizedClipExtent

  // Convert normalized coordinates to pixel coordinates
  // In the old system, these were multiplied by referenceScale and added to territory center
  // In the new system, they represent pixel offsets directly from translateOffset
  const pixelX1 = x1 * referenceScale
  const pixelY1 = y1 * referenceScale
  const pixelX2 = x2 * referenceScale
  const pixelY2 = y2 * referenceScale

  return [[pixelX1, pixelY1], [pixelX2, pixelY2]]
}

/**
 * Convert an entire preset territory from legacy to pixel-based format
 */
export function convertTerritoryPreset(territory: any): any {
  if (!territory.layout?.clipExtent) {
    return territory
  }

  const clipExtent = territory.layout.clipExtent

  // Check if already pixel-based (values > 1 indicate pixel coordinates)
  const [[x1, y1], [x2, y2]] = clipExtent
  const isAlreadyPixelBased = Math.abs(x1) > 1 || Math.abs(y1) > 1 || Math.abs(x2) > 1 || Math.abs(y2) > 1

  if (isAlreadyPixelBased) {
    console.log(`Territory ${territory.code} already uses pixel-based clipExtent`)
    return territory
  }

  const pixelClipExtent = convertClipExtentToPixels(clipExtent)

  console.log(`Converting ${territory.code}:`)
  console.log(`  Legacy: ${JSON.stringify(clipExtent)}`)
  console.log(`  Pixel:  ${JSON.stringify(pixelClipExtent)}`)

  return {
    ...territory,
    layout: {
      ...territory.layout,
      clipExtent: pixelClipExtent,
    },
  }
}

/**
 * Convert an entire preset file from legacy to pixel-based format
 */
export function convertPresetFile(preset: any): any {
  if (!preset.territories) {
    return preset
  }

  const convertedTerritories = preset.territories.map(convertTerritoryPreset)

  return {
    ...preset,
    territories: convertedTerritories,
    metadata: {
      ...preset.metadata,
      notes: `${preset.metadata?.notes || ''} - Converted to pixel-based clipExtent format`.trim(),
    },
  }
}

// Example usage:
if (require.main === module) {
  // Example conversion
  const legacyTerritory = {
    code: 'FR-GF',
    name: 'French Guiana',
    layout: {
      translateOffset: [-324, 155],
      clipExtent: [[-0.14, 0.029], [-0.0996, 0.0864]],
    },
  }

  const converted = convertTerritoryPreset(legacyTerritory)
  console.log('Converted:', JSON.stringify(converted, null, 2))
}
