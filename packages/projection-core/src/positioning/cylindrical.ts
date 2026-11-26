type Center = [number, number]
type Rotate = [number, number] | [number, number, number]

/** The cylindrical projections that a composite view places by their center, with their cut on the meridian opposite this center */
export const CENTER_PLACED_CYLINDRICAL_IDS: readonly string[] = ['mercator', 'equirectangular']

export interface CylindricalPlacement {
  center?: Center
  rotate?: Rotate
}

/**
 * The center and rotate that a composite view applies to a sub-projection. A mercator or an equirectangular placed by
 * `center: [λ, φ]`, with a missing rotate or a rotate whose values are all zero, and without clipAngle, turns the globe by -λ and keeps φ as center:
 * each point has the image of `center([λ, φ])` alone, and the cut moves from the antimeridian to the meridian λ + 180.
 * Every other projection keeps its parameters. The caller resolves the aliases of the projection id first
 */
export function placeCylindrical(projectionId: string, { center, rotate, clipAngle }: CylindricalPlacement & { clipAngle?: number }): CylindricalPlacement {
  const zeroRotate = !rotate || rotate.every(value => value === 0)
  if (!CENTER_PLACED_CYLINDRICAL_IDS.includes(projectionId) || !center || !zeroRotate || clipAngle !== undefined) {
    return { center, rotate }
  }
  const [longitude, latitude] = center
  // Adding zero turns -0 into 0
  return { center: [0, latitude], rotate: [-longitude + 0, 0, 0] }
}
