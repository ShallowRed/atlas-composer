import { describe, expect, it } from 'vitest'
import en from '../locales/en.json'
import fr from '../locales/fr.json'

function keysOf(messages: object, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = `${prefix}${key}`
    return typeof value === 'object' && value !== null ? keysOf(value, `${path}.`) : [path]
  })
}

describe('locales', () => {
  it('declare the same keys in each language', () => {
    expect(keysOf(en).sort()).toEqual(keysOf(fr).sort())
  })
})
