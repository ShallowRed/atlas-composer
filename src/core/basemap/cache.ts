// The cached images of the basemaps, which the deployment renders and the application reads; without imports, so that the deployment script imports it

// The pixel ratios of the cached images; a screen between two of them reads the image of the next one
export const CACHED_PIXEL_RATIOS = [1, 2, 3] as const

// The folder of the site that holds, for each build, the cached images and their index
export const BASEMAP_CACHE_DIRECTORY = 'basemaps'

// The attribute of a complete image of a basemap, whose value is its fingerprint
export const FINGERPRINT_ATTRIBUTE = 'data-basemap-fingerprint'
