/// <reference lib="dom" />
/**
 * Renders the relief of each map of the initial view and of the split view of each atlas of the registry, at the
 * pixel ratios of CACHED_PIXEL_RATIOS, into dist/<BASEMAP_CACHE_DIRECTORY>/<build>/<fingerprint>.webp, and lists the
 * fingerprints in index.json of the same folder.
 *
 * The built site renders each image itself: the script opens it in Chromium, waits for the image of the basemap
 * of each map, which carries its fingerprint, and reads the build from the address of the index that the site requests.
 * A view that fails, with all its maps, stays out of the index and the site renders its basemaps: the script never fails the deployment.
 *
 * Terrain Tiles on AWS (https://github.com/tilezen/joerd/blob/master/docs/attribution.md): every source asks for its attribution,
 * GMTED2010 for a description of the modifications, and ETOPO1 for a notice of the material of the US Government in a
 * derived work. The full attribution of the relief in src/core/basemap/sources.ts names the sources and the shading.
 */

import type { Browser } from 'playwright'
import { Buffer } from 'node:buffer'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'
import { preview } from 'vite'
import { logger } from '#scripts/utils/logger'
import registry from '../configs/atlas-registry.json' with { type: 'json' }
import { BASEMAP_CACHE_DIRECTORY, CACHED_PIXEL_RATIOS, FINGERPRINT_ATTRIBUTE } from '../src/core/basemap/cache.js'

const ATTEMPTS = 3
const MAP_TIMEOUT = 60_000
// Past this time, the maps left render their basemap on the site: an unreachable tile service never holds the deployment
const RUN_TIMEOUT = 15 * 60_000
// The fingerprint stays the same for this long once the basemap has loaded
const STABLE_DELAY = 1000
const WEBP_QUALITY = 0.8
const INDEX_PATTERN = new RegExp(`${BASEMAP_CACHE_DIRECTORY}/([^/]+)/index\\.json$`)
// A map of the view, and its complete images: a map keeps its previous image under the new one until the new one is decoded, so the last image is the current one
const MAP_PLOT = '.map-plot'
const COMPLETE_IMAGE = `svg image[${FINGERPRINT_ATTRIBUTE}]`

interface RenderedView {
  build: string
  maps: Array<{ fingerprint: string, webp: Buffer }>
}

function warn(message: string) {
  // A GitHub annotation in the deployment
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::warning::${message}`)
  }
  else {
    logger.warning(message)
  }
}

// The views whose relief the site shows at once: the initial view of each atlas, and its split view when it has one
function viewsOf(atlas: (typeof registry.atlases)[number]): Array<{ name: string, query: string }> {
  const views = [{ name: atlas.id, query: `atlas=${atlas.id}` }]
  if (atlas.presets?.some(preset => preset.type === 'split')) {
    views.push({ name: `${atlas.id} split`, query: `atlas=${atlas.id}&view=split` })
  }
  return views
}

async function renderView(browser: Browser, url: string, pixelRatio: number): Promise<RenderedView> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: pixelRatio })
  try {
    const page = await context.newPage()
    let build: string | null = null
    page.on('request', (request) => {
      build ??= INDEX_PATTERN.exec(new URL(request.url()).pathname)?.[1] ?? null
    })
    // Without the index, the site renders the basemap: an image that a previous run wrote in dist stays out of the new one
    await page.route(INDEX_PATTERN, route => route.fulfill({ status: 404 }))
    await page.goto(url)
    // The relief is the default basemap; the click keeps the script working if the default changes.
    // The radio is visually hidden: a click on its label chooses it, as a visitor does
    const relief = page.locator('input[name=basemap][value=relief]')
    if (!await relief.isChecked({ timeout: MAP_TIMEOUT })) {
      await page.locator('[role=radiogroup] label', { has: relief }).click()
    }
    // Every map of the view has a complete image once its basemap has loaded
    await page.waitForFunction(
      ({ plot, image }) => {
        const plots = [...document.querySelectorAll(plot)]
        return plots.length > 0 && plots.every(element => element.querySelector(image) !== null) && document.querySelector('.map-renderer .loading') === null
      },
      { plot: MAP_PLOT, image: COMPLETE_IMAGE },
      { timeout: MAP_TIMEOUT },
    )
    const fingerprintsOf = () => page.evaluate(({ plot, image, attribute }) => [...document.querySelectorAll(plot)]
      .map(element => [...element.querySelectorAll(image)].at(-1)?.getAttribute(attribute) ?? null)
      .join(' '), { plot: MAP_PLOT, image: COMPLETE_IMAGE, attribute: FINGERPRINT_ATTRIBUTE })
    const fingerprints = await fingerprintsOf()
    await page.waitForTimeout(STABLE_DELAY)
    if (await fingerprintsOf() !== fingerprints) {
      throw new Error('the images of the basemap changed after their load')
    }
    if (!build) {
      throw new Error('the site requested no index of the cached basemaps')
    }
    const encoded = await page.evaluate(async ({ plot, image, attribute, quality }) => Promise.all([...document.querySelectorAll(plot)].map(async (element) => {
      // The content security policy of the site refuses a fetch of the blob address: the decoded element gives its pixels
      const complete = [...element.querySelectorAll<SVGImageElement>(image)].at(-1)!
      const bitmap = await createImageBitmap(complete)
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
      const webp = await canvas.convertToBlob({ type: 'image/webp', quality })
      const bytes = new Uint8Array(await webp.arrayBuffer())
      let binary = ''
      for (const byte of bytes) {
        binary += String.fromCharCode(byte)
      }
      return { fingerprint: complete.getAttribute(attribute)!, base64: btoa(binary) }
    })), { plot: MAP_PLOT, image: COMPLETE_IMAGE, attribute: FINGERPRINT_ATTRIBUTE, quality: WEBP_QUALITY })
    // The pixels and the fingerprints come from the same elements
    if (encoded.map(({ fingerprint }) => fingerprint).join(' ') !== fingerprints) {
      throw new Error('the images of the basemap changed while they were read')
    }
    return { build, maps: encoded.map(({ fingerprint, base64 }) => ({ fingerprint, webp: Buffer.from(base64, 'base64') })) }
  }
  finally {
    await context.close()
  }
}

async function main() {
  const server = await preview({ mode: 'production', preview: { port: 0, open: false } })
  const images = new Map<string, Buffer>()
  const builds = new Set<string>()
  let failedViews = 0
  let browser: Browser | null = null
  try {
    const siteUrl = server.resolvedUrls?.local[0]
    if (!siteUrl) {
      throw new Error('the preview server gave no address')
    }
    browser = await chromium.launch()
    const deadline = Date.now() + RUN_TIMEOUT
    for (const { name, query } of registry.atlases.flatMap(viewsOf)) {
      for (const pixelRatio of CACHED_PIXEL_RATIOS) {
        let rendered = false
        for (let attempt = 1; attempt <= ATTEMPTS && Date.now() < deadline && !rendered; attempt++) {
          try {
            const { build, maps } = await renderView(browser, `${siteUrl}?${query}`, pixelRatio)
            builds.add(build)
            maps.forEach(({ fingerprint, webp }) => images.set(fingerprint, webp))
            const size = maps.reduce((sum, { webp }) => sum + webp.length, 0)
            logger.info(`${name} at ${pixelRatio}: ${maps.length} ${maps.length === 1 ? 'map' : 'maps'}, ${Math.round(size / 1000)} kB`)
            rendered = true
          }
          catch (error) {
            const reason = error instanceof Error ? error.message.split('\n')[0] : String(error)
            if (attempt === ATTEMPTS || Date.now() >= deadline) {
              warn(`${name} at ${pixelRatio}: no cached basemap after ${attempt} attempts (${reason})`)
            }
          }
        }
        failedViews += rendered ? 0 : 1
      }
    }
  }
  finally {
    await browser?.close()
    await new Promise<void>((resolve, reject) => server.httpServer.close(error => (error ? reject(error) : resolve())))
  }

  const [build] = builds
  if (builds.size !== 1 || !build) {
    warn(`no cached basemap: the site gave ${builds.size} builds`)
    return
  }
  const directory = path.join('dist', BASEMAP_CACHE_DIRECTORY, build)
  await fs.mkdir(directory, { recursive: true })
  for (const [fingerprint, webp] of images) {
    await fs.writeFile(path.join(directory, `${fingerprint}.webp`), webp)
  }
  await fs.writeFile(path.join(directory, 'index.json'), `${JSON.stringify([...images.keys()].sort())}\n`)
  const total = [...images.values()].reduce((sum, webp) => sum + webp.length, 0)
  logger.success(`${images.size} cached basemaps, ${Math.round(total / 1000)} kB, in ${directory}`)
  if (failedViews > 0) {
    warn(`${failedViews} ${failedViews === 1 ? 'view at a pixel ratio draws its' : 'views at a pixel ratio draw their'} basemaps on the site`)
  }
}

main().catch((error: unknown) => {
  warn(`no cached basemap: ${error instanceof Error ? error.message : String(error)}`)
})
