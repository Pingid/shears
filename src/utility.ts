import * as E from '@effect-ts/core/Effect'

export type Shear<R, A> = E.Effect<R, ShearError, A>
export class ShearError extends Error {
  constructor(m?: string, fn?: Function) {
    super(m)
    Error.captureStackTrace(this, fn)
  }
}

export const is =
  <T extends any>(fn: (x: unknown) => boolean) =>
  (x: unknown): x is T =>
    fn(x)
is.function = is<Function>((x) => typeof x === 'function')
is.object = is<object>((x) => typeof x === 'object')
is.string = is<string>((x) => typeof x === 'string')
is.array = is<any[]>((x) => Array.isArray(x))
is.shape = is<Record<any, any>>((x) => is.object(x) && !is.function(x) && !is.array(x) && !is.null(x))
is.null = is<null>((x) => x === null)
is.undefined = is<undefined>((x) => typeof x === 'undefined')

export type Last<T extends any[]> = T extends [...any[], infer D] ? D : never
export type CountArrayDepth<A, B> = A extends []
  ? B
  : A extends [infer H, ...infer R]
  ? H extends [any]
    ? CountArrayDepth<R, B[]>
    : CountArrayDepth<R, B>
  : never
