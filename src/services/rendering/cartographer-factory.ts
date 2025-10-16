/**
 * Cartographer Factory
 * Factory for creating and managing region-specific Cartographer instances
 *
 * This factory ensures:
 * - Each region gets its own Cartographer instance
 * - Instances are cached to avoid re-initialization
 * - Proper cleanup when switching regions
 */

import { getAtlasConfig } from '@/core/atlases/registry'
import { TerritoryStoreClipExtentProvider } from '@/services/projection/territory-store-clip-extent-provider'
import { Cartographer } from '@/services/rendering/cartographer-service'

export class CartographerFactory {
  private static instances = new Map<string, Cartographer>()

  /**
   * Create or retrieve a Cartographer instance for a region
   * Instances are cached to avoid re-initialization
   */
  static async create(regionId: string): Promise<Cartographer> {
    // Return cached instance if available
    if (this.instances.has(regionId)) {
      return this.instances.get(regionId)!
    }

    // Get region configuration
    const regionConfig = getAtlasConfig(regionId)

    // Create clipExtent provider to connect territory store to rendering
    const clipExtentProvider = new TerritoryStoreClipExtentProvider()

    // Create new Cartographer instance with region-specific config
    const cartographer = new Cartographer(
      regionConfig.geoDataConfig,
      regionConfig.compositeProjectionConfig,
      undefined, // projectionParams
      undefined, // parameterProvider
      undefined, // referenceScale
      undefined, // canvasDimensions
      clipExtentProvider,
    )

    // Initialize the cartographer
    await cartographer.init()

    // Cache the instance
    this.instances.set(regionId, cartographer)

    return cartographer
  }

  /**
   * Get cached instance for a region (if exists)
   */
  static getInstance(regionId: string): Cartographer | undefined {
    return this.instances.get(regionId)
  }

  /**
   * Check if an instance exists for a region
   */
  static hasInstance(regionId: string): boolean {
    return this.instances.has(regionId)
  }

  /**
   * Clear specific region instance
   */
  static clearInstance(regionId: string): void {
    this.instances.delete(regionId)
  }

  /**
   * Clear all cached instances
   */
  static clearCache(): void {
    this.instances.clear()
  }

  /**
   * Get all cached region IDs
   */
  static getCachedRegions(): string[] {
    return Array.from(this.instances.keys())
  }
}
