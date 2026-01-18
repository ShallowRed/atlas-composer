export type Result<T, E = Error>
  = | { ok: true, value: T }
    | { ok: false, error: E }

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

// Type Guards

export function isOk<T, E>(result: Result<T, E>): result is { ok: true, value: T } {
  return result.ok
}

export function isErr<T, E>(result: Result<T, E>): result is { ok: false, error: E } {
  return !result.ok
}

export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) {
    return result.value
  }
  throw result.error instanceof Error ? result.error : new Error(String(result.error))
}

export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback
}

export function unwrapErr<T, E>(result: Result<T, E>): E | undefined {
  return result.ok ? undefined : result.error
}

export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result
}

export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  return result.ok ? result : err(fn(result.error))
}

export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return result.ok ? fn(result.value) : result
}

export async function fromPromise<T, E = Error>(
  promise: Promise<T>,
  mapError?: (error: unknown) => E,
): Promise<Result<T, E>> {
  try {
    const value = await promise
    return ok(value)
  }
  catch (error) {
    if (mapError) {
      return err(mapError(error))
    }
    return err(error as E)
  }
}

/**
 * Combine multiple results into a single result
 * Returns first error if any, or array of values
 */
export function all<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = []
  for (const result of results) {
    if (!result.ok) {
      return result
    }
    values.push(result.value)
  }
  return ok(values)
}

// Conversion Utilities

/**
 * LoadResult-style type (for compatibility with existing preset/init code)
 * This mirrors the existing LoadResult pattern with warnings support
 */
export interface LoadResultLike<T> {
  success: boolean
  data?: T
  errors: string[]
  warnings: string[]
}

/**
 * Convert Result to LoadResult-style object
 */
export function toLoadResult<T, E>(
  result: Result<T, E>,
  errorToString: (e: E) => string = String,
): LoadResultLike<T> {
  if (result.ok) {
    return {
      success: true,
      data: result.value,
      errors: [],
      warnings: [],
    }
  }
  return {
    success: false,
    errors: [errorToString(result.error)],
    warnings: [],
  }
}

/**
 * Convert LoadResult-style object to Result
 */
export function fromLoadResult<T>(loadResult: LoadResultLike<T>): Result<T, string[]> {
  if (loadResult.success && loadResult.data !== undefined) {
    return ok(loadResult.data)
  }
  return err(loadResult.errors)
}
