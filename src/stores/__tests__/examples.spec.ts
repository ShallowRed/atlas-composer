import { readFile } from 'node:fs/promises'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EXAMPLES } from '@/core/examples'
import { useExamplesStore } from '@/stores/examples'

describe('loadExampleMap', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('gives the error of a missing data file', async () => {
    vi.stubGlobal('fetch', async (url: string) => url.includes('examples/')
      ? new Response('', { status: 404 })
      : new Response(await readFile(`.${url}`, 'utf8')))

    const result = await useExamplesStore().loadExampleMap(EXAMPLES[0]!)

    expect(!result.ok && result.error.code).toBe('JSON_FILE_NOT_FOUND')
  })
})
