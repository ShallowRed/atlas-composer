import type { ProjectionParameters } from '@/types/projection-parameters'

function definedEntries(record: object): Map<string, unknown> {
  return new Map(Object.entries(record).filter(([, value]) => value !== undefined))
}

function areRecordsEqual(a: object, b: object): boolean {
  const entriesA = definedEntries(a)
  const entriesB = definedEntries(b)
  return entriesA.size === entriesB.size
    && [...entriesA].every(([key, value]) => entriesB.has(key) && areValuesEqual(value, entriesB.get(key)))
}

function areValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length
      && a.every((value, index) => areValuesEqual(value, b[index]))
  }
  return typeof a === 'object' && typeof b === 'object' && a !== null && b !== null && areRecordsEqual(a, b)
}

export function areParametersEqual(a: ProjectionParameters, b: ProjectionParameters): boolean {
  return areRecordsEqual(a, b)
}
