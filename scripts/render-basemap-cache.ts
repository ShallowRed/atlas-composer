/// <reference lib="dom" />
/**
 * Renders the relief of the initial view of each atlas of the registry, at the pixel ratios 1, 2 and 3, into
 * dist/basemaps/<build>/<fingerprint>.webp, and lists the fingerprints in dist/basemaps/<build>/index.json.
 *
 * The built site renders each image itself: the script opens it in Chromium, waits for the image of the basemap
 * that carries its fingerprint, and reads the build from the address of the index that the site requests.
 * A map that fails stays out of the index and the site renders its basemap: the script never fails the deployment.
 *
 * Terrain Tiles on AWS: the sources ask for attribution only (https://github.com/tilezen/joerd/blob/master/docs/attribution.md).
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

const PIXEL_RATIOS = [1, 2, 3]
const ATTEMPTS = 3
const MAP_TIMEOUT = 60_000
// Past this time, the maps left render their basemap on the site: an unreachable tile service never holds the deployment
const RUN_TIMEOUT = 15 * 60_000
// The fingerprint stays the same for this long once the basemap has loaded
const STABLE_DELAY = 1000
const WEBP_QUALITY = 0.8
const INDEX_PATTERN = /basemaps\/([^/]+)\/index\.json$/

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
    await page.goto(url)
    // The radio is visually hidden: a click on its label chooses it, as a visitor does
    const relief = page.locator('input[name=basemap][value=relief]')
    if (!await relief.isChecked({ timeout: MAP_TIMEOUT })) {
      await page.locator('[role=radiogroup] label', { has: relief }).click()
    }
    // The last complete image: the previous one stays under it until the new one is decoded
    const fingerprintOf = () => page.evaluate(() => [...document.querySelectorAll('.map-plot svg image[data-basemap-fingerprint]')].at(-1)?.getAttribute('data-basemap-fingerprint') ?? null)
    await page.waitForFunction(
      () => document.querySelector('.map-plot svg image[data-basemap-fingerprint]') !== null && document.querySelector('.map-renderer .loading') === null,
      null,
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
    const encoded = await page.evaluate(async (quality) => {
      // The content security policy of the site refuses a fetch of the blob address: the decoded element gives its pixels
      const image = [...document.querySelectorAll<SVGImageElement>('.map-plot svg image[data-basemap-fingerprint]')].at(-1)!
      const bitmap = await createImageBitmap(image)
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
      const webp = await canvas.convertToBlob({ type: 'image/webp', quality })
      const bytes = new Uint8Array(await webp.arrayBuffer())
      let binary = ''
      for (const byte of bytes) {
        binary += String.fromCharCode(byte)
      }
      return { fingerprint: image.getAttribute('data-basemap-fingerprint'), base64: btoa(binary) }
    }, WEBP_QUALITY)
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
      for (const pixelRatio of PIXEL_RATIOS) {
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
  const directory = path.join('dist', 'basemaps', build)
  await fs.mkdir(directory, { recursive: true })
  for (const [fingerprint, webp] of images) {
    await fs.writeFile(path.join(directory, `${fingerprint}.webp`), webp)
  }
  await fs.writeFile(path.join(directory, 'index.json'), `${JSON.stringify([...images.keys()].sort())}\n`)
  const total = [...images.values()].reduce((sum, webp) => sum + webp.length, 0)
  logger.success(`${images.size} cached basemaps, ${Math.round(total / 1000)} kB, in ${directory}`)
  const expected = registry.atlases.length * PIXEL_RATIOS.length
  if (images.size < expected) {
    warn(`${expected - images.size} of the ${expected} initial views draw their basemap on the site`)
  }
}

main().catch((error: unknown) => {
  warn(`no cached basemap: ${error instanceof Error ? error.message : String(error)}`)
})
