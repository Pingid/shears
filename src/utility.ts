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
is.falsy = is<null | undefined>((x) => x === null || x === undefined)
is.undefined = is<undefined>((x) => typeof x === 'undefined')

export type CountArrayDepth<A, B> = A extends []
  ? B
  : A extends [infer H, ...infer R]
  ? H extends [any]
    ? CountArrayDepth<R, B[]>
    : CountArrayDepth<R, B>
  : never

export class QueryError extends Error {
  constructor(m?: string, fn?: Function) {
    super(m)
    Error.captureStackTrace(this, fn)
  }
}
