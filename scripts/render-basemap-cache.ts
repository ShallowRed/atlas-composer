/// <reference lib="dom" />
/**
 * Renders the relief of the initial view of each atlas of the registry, at the pixel ratios of CACHED_PIXEL_RATIOS,
 * into dist/basemaps/<build>/<fingerprint>.webp, and lists the fingerprints in dist/basemaps/<build>/index.json.
 *
 * The built site renders each image itself: the script opens it in Chromium, waits for the image of the basemap
 * that carries its fingerprint, and reads the build from the address of the index that the site requests.
 * A map that fails stays out of the index and the site renders its basemap: the script never fails the deployment.
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
// The last complete image of the map: the previous one stays under it until the new one is decoded
const COMPLETE_IMAGE = `.map-plot svg image[${FINGERPRINT_ATTRIBUTE}]`

interface RenderedMap {
  build: string
  fingerprint: string
  webp: Buffer
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

async function renderMap(browser: Browser, url: string, pixelRatio: number): Promise<RenderedMap> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: pixelRatio })
  try {
    const page = await context.newPage()
    let build: string | null = null
    page.on('request', (request) => {
      build ??= INDEX_PATTERN.exec(new URL(request.url()).pathname)?.[1] ?? null
    })
    // Without the index, the site renders the basemap instead of showing an image that a previous run wrote in dist
    await page.route(INDEX_PATTERN, route => route.fulfill({ status: 404 }))
    await page.goto(url)
    // The relief is the default basemap; the click keeps the script working if the default changes.
    // The radio is visually hidden: a click on its label chooses it, as a visitor does
    const relief = page.locator('input[name=basemap][value=relief]')
    if (!await relief.isChecked({ timeout: MAP_TIMEOUT })) {
      await page.locator('[role=radiogroup] label', { has: relief }).click()
    }
    const fingerprintOf = () => page.evaluate(([selector, attribute]) => [...document.querySelectorAll(selector)].at(-1)?.getAttribute(attribute) ?? null, [COMPLETE_IMAGE, FINGERPRINT_ATTRIBUTE])
    await page.waitForFunction(
      selector => document.querySelector(selector) !== null && document.querySelector('.map-renderer .loading') === null,
      COMPLETE_IMAGE,
      { timeout: MAP_TIMEOUT },
    )
    const fingerprint = await fingerprintOf()
    await page.waitForTimeout(STABLE_DELAY)
    if (!fingerprint || await fingerprintOf() !== fingerprint) {
      throw new Error('the image of the basemap changed after its load')
    }
    if (!build) {
      throw new Error('the site requested no index of the cached basemaps')
    }
    const encoded = await page.evaluate(async ({ selector, attribute, quality }) => {
      // The content security policy of the site refuses a fetch of the blob address: the decoded element gives its pixels
      const image = [...document.querySelectorAll<SVGImageElement>(selector)].at(-1)!
      const bitmap = await createImageBitmap(image)
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
      const webp = await canvas.convertToBlob({ type: 'image/webp', quality })
      const bytes = new Uint8Array(await webp.arrayBuffer())
      let binary = ''
      for (const byte of bytes) {
        binary += String.fromCharCode(byte)
      }
      return { fingerprint: image.getAttribute(attribute), base64: btoa(binary) }
    }, { selector: COMPLETE_IMAGE, attribute: FINGERPRINT_ATTRIBUTE, quality: WEBP_QUALITY })
    // The pixels and the fingerprint come from the same element
    if (encoded.fingerprint !== fingerprint) {
      throw new Error('the image of the basemap changed while it was read')
    }
    return { build, fingerprint, webp: Buffer.from(encoded.base64, 'base64') }
  }
  finally {
    await context.close()
  }
}

async function main() {
  const server = await preview({ mode: 'production', preview: { port: 0, open: false } })
  const images = new Map<string, Buffer>()
  const builds = new Set<string>()
  let browser: Browser | null = null
  try {
    const siteUrl = server.resolvedUrls?.local[0]
    if (!siteUrl) {
      throw new Error('the preview server gave no address')
    }
    browser = await chromium.launch()
    const deadline = Date.now() + RUN_TIMEOUT
    for (const { id } of registry.atlases) {
      for (const pixelRatio of CACHED_PIXEL_RATIOS) {
        for (let attempt = 1; attempt <= ATTEMPTS && Date.now() < deadline; attempt++) {
          try {
            const { build, fingerprint, webp } = await renderMap(browser, `${siteUrl}?atlas=${id}`, pixelRatio)
            builds.add(build)
            images.set(fingerprint, webp)
            logger.info(`${id} at ${pixelRatio}: ${fingerprint}, ${Math.round(webp.length / 1000)} kB`)
            break
          }
          catch (error) {
            const reason = error instanceof Error ? error.message.split('\n')[0] : String(error)
            if (attempt === ATTEMPTS || Date.now() >= deadline) {
              warn(`${id} at ${pixelRatio}: no cached basemap after ${attempt} attempts (${reason})`)
            }
          }
        }
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
  const expected = registry.atlases.length * CACHED_PIXEL_RATIOS.length
  if (images.size < expected) {
    warn(`${expected - images.size} of the ${expected} initial views draw their basemap on the site`)
  }
}

main().catch((error: unknown) => {
  warn(`no cached basemap: ${error instanceof Error ? error.message : String(error)}`)
})
