import { getAtlasConfig } from '@/core/atlases/registry'

import { Cartographer } from '@/services/rendering/cartographer-service'

export class CartographerFactory {
  private static instances = new Map<string, Cartographer>()

  static async create(regionId: string): Promise<Cartographer> {
    if (this.instances.has(regionId)) {
      return this.instances.get(regionId)!
    }

    const regionConfig = getAtlasConfig(regionId)

    const cartographer = new Cartographer(
      regionConfig.geoDataConfig,
      regionConfig.compositeProjectionConfig,
      undefined, // projectionParams
      undefined, // parameterProvider
      undefined, // referenceScale
      undefined, // canvasDimensions
    )

    await cartographer.init()

    this.instances.set(regionId, cartographer)

    return cartographer
  }

  static getInstance(regionId: string): Cartographer | undefined {
    return this.instances.get(regionId)
  }

  static hasInstance(regionId: string): boolean {
    return this.instances.has(regionId)
  }

  static clearInstance(regionId: string): void {
    this.instances.delete(regionId)
  }

  static clearCache(): void {
    this.instances.clear()
  }

  static getCachedRegions(): string[] {
    return Array.from(this.instances.keys())
  }
}
