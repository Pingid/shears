// -------------------------------------------------------------------------------------
// Type guard utility
// -------------------------------------------------------------------------------------
export const is = <T extends any>(fn: (x: unknown) => boolean) => (x: unknown): x is T => fn(x)
is.function = is<Function>((x) => typeof x === 'function')
is.object = is<object>((x) => typeof x === 'object')
is.string = is<string>((x) => typeof x === 'string')
is.array = is<any[]>((x) => Array.isArray(x))
is.shape = is<Record<any, any>>((x) => is.object(x) && !is.function(x) && !is.array(x) && !is.null(x))
is.null = is<null>((x) => x === null)
