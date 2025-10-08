/**
 * Cartographer Factory
 * Factory for creating and managing region-specific Cartographer instances
 *
 * This factory ensures:
 * - Each region gets its own Cartographer instance
 * - Instances are cached to avoid re-initialization
 * - Proper cleanup when switching regions
 */

import { getRegionConfig } from '@/core/regions/registry'
import { Cartographer } from '@/services/Cartographer'

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
    const regionConfig = getRegionConfig(regionId)

    // Create new Cartographer instance with region-specific config
    const cartographer = new Cartographer(
      regionConfig.geoDataConfig,
      regionConfig.compositeProjectionConfig,
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
