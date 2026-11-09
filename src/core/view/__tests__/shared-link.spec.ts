import { describe, expect, it } from 'vitest'
import { parseSharedLink } from '../shared-link'

describe('parseSharedLink', () => {
  it('reads the values of a link', () => {
    expect(parseSharedLink({
      atlas: 'usa',
      view: 'split',
      projection: 'mercator',
      territory: 'all-territories',
      rlon: '-40',
      rlat: '10.5',
      rgam: '0',
      p1: '20',
      p2: '50',
      t: JSON.stringify({ 's_FR-GP': 1.5, 'tx_FR-GP': -320, 'ty_FR-GP': -40 }),
    })).toEqual({
      atlas: 'usa',
      view: 'split',
      projection: 'mercator',
      territoryMode: 'all-territories',
      rotate: [-40, 10.5, 0],
      parallels: [20, 50],
      territories: new Map([['FR-GP', { scale: 1.5, translation: [-320, -40] }]]),
    })
  })

  it('gives the id of a projection named by an alias', () => {
    expect(parseSharedLink({ projection: 'web-mercator' }).projection).toBe('mercator')
  })

  it.each([
    ['an unknown atlas', { atlas: 'nowhere' }],
    ['a repeated atlas', { atlas: ['france', 'usa'] }],
    ['a null atlas', { atlas: null }],
    ['the name of an object member as atlas', { atlas: 'constructor' }],
    ['an unknown view', { view: 'nowhere' }],
    ['a repeated view', { view: ['split', 'unified'] }],
    ['an unknown projection', { projection: 'nowhere' }],
    ['constructor as projection', { projection: 'constructor' }],
    ['__proto__ as projection', { projection: '__proto__' }],
    ['an empty territory mode', { territory: '' }],
    ['a repeated territory mode', { territory: ['a', 'b'] }],
  ])('ignores %s', (_, query) => {
    expect(parseSharedLink(query)).toEqual({ territories: new Map() })
  })

  it.each(['abc', 'Infinity', '-Infinity', '1e999', '', '   ', 'NaN'])('ignores the rotation and the parallels when a number reads %j', (value) => {
    const link = parseSharedLink({ rlon: value, rlat: '1', rgam: '1', p1: value, p2: '1' })

    expect(link.rotate).toBeUndefined()
    expect(link.parallels).toBeUndefined()
  })

  it('needs the three axes of a rotation and the two parallels', () => {
    const link = parseSharedLink({ rlon: '1', rlat: '1', p1: '1' })

    expect(link.rotate).toBeUndefined()
    expect(link.parallels).toBeUndefined()
  })

  it.each(['{', '1', 'null', '"text"', '[1]'])('reads no territory from t=%s', (t) => {
    expect(parseSharedLink({ t }).territories).toEqual(new Map())
  })

  it('reads no territory from a repeated t', () => {
    expect(parseSharedLink({ t: ['{}', '{}'] }).territories).toEqual(new Map())
  })

  it('ignores the values of t that are not finite numbers, and a translation without its second axis', () => {
    const { territories } = parseSharedLink({
      t: '{"s_A":"2","s_B":1e999,"s_C":true,"tx_D":1,"ty_E":1}',
    })

    expect(territories).toEqual(new Map())
  })

  it('leaves Object.prototype unchanged by a __proto__ entry', () => {
    const { territories } = parseSharedLink({ t: '{"s___proto__":2,"__proto__":{"polluted":1}}' })

    expect(territories.get('__proto__')).toEqual({ scale: 2 })
    expect(Object.keys(Object.prototype)).toEqual([])
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})
