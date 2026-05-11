export type Ok<T> = { ok: true; data: T };
export type Err = { ok: false; error: string; code?: ErrorCode };
export type Result<T> = Ok<T> | Err;

export type ErrorCode = 'not_found' | 'validation' | 'unauthorized' | 'internal';

export function ok<T>(data: T): Ok<T> {
  return { ok: true, data };
}

export function err(error: string, code: ErrorCode = 'internal'): Err {
  return { ok: false, error, code };
}
