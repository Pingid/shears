import { readerTaskEither, chain, ask, map, ReaderTaskEither, of } from 'fp-ts/lib/ReaderTaskEither'
import { pipe } from 'fp-ts/lib/pipeable'
import * as A from 'fp-ts/lib/Array'
import { sequenceS, sequenceT } from 'fp-ts/Apply'
import { Context, Parsed, Shear } from './types'

/**
 * Join shears in series
 *
 * @example
 *
 * const innerText = join($('h1'), text);
 *
 * @category Selector
 * @since 1.0.0
 * @params shears
 */
export const join: Join = (...[head, ...tail]: any[]) =>
  !head
    ? readerTaskEither.map(ask<Context<any, any>>(), (x) => x.data)
    : readerTaskEither.chain(head, (x) => (y: any) => join(...(tail as [Shear<any, any, any>]))({ ...y, data: x }))

type Join = {
  (): Shear<any, any, unknown>
  <R, A, N>(a: Shear<R, A, N>): Shear<R, A, N>
  <R, A, B, N>(a: Shear<R, A, N>, b: Shear<A, B, N>): Shear<R, B, N>
  <R, A, B, C, N>(a: Shear<R, A, N>, b: Shear<A, B, N>, c: Shear<B, C, N>): Shear<R, C, N>
  <R, A, B, C, D, N>(a: Shear<R, A, N>, b: Shear<A, B, N>, c: Shear<B, C, N>, d: Shear<C, D, N>): Shear<R, D, N>
  <R, A, B, C, D, E, N>(
    a: Shear<R, A, N>,
    b: Shear<A, B, N>,
    c: Shear<B, C, N>,
    d: Shear<C, D, N>,
    e: Shear<D, E, N>
  ): Shear<E, R, N>
  <R, A, B, C, D, E, F, N>(
    a: Shear<R, A, N>,
    b: Shear<A, B, N>,
    c: Shear<B, C, N>,
    d: Shear<C, D, N>,
    e: Shear<D, E, N>,
    f: Shear<E, F, N>
  ): Shear<R, F, N>
  <R, A, B, C, D, E, F, G, N>(
    a: Shear<R, A, N>,
    b: Shear<A, B, N>,
    c: Shear<B, C, N>,
    d: Shear<C, D, N>,
    e: Shear<D, E, N>,
    f: Shear<E, F, N>,
    g: Shear<F, G, N>
  ): Shear<R, G, N>
}

/**
 * Resolves a structured shear.
 *
 * @example
 *
 * const contents = fork({ title: query('h1') })
 *
 * @category Selector
 * @since 1.0.0
 */
export const fork = <T extends Forked, N>(fork: T): Shear<Parsed, ForkResult<T>, N> => {
  if (is<Shear<any, any, N>>(is.function)(fork)) return fork
  if (is<Shear<any, any, N>[]>(is.array)(fork)) return sequenceT(readerTaskEither)(...(fork as any)) as any
  if (is<{ [x: string]: Forked<any> }>(is.object)(fork)) return sequenceS(readerTaskEither)(fork as any) as any
  throw new Error(`Select does not accept a selector of ${typeof fork}`)
}

type Forked<T = any, R = any, N = any> = Shear<T, R, N> | Shear<T, R, N>[] | { [x: string]: Shear<T, R, N> }
type ForkResult<T extends Forked> = T extends Shear<any, infer D, any>
  ? D
  : T extends Shear<any, any, any>[]
  ? {
      [I in keyof T]: ForkResult<Extract<T[I], T[number]>> // Extract is needed here
    }
  : T extends { [x: string]: Shear<any, any, any> }
  ? { [Key in keyof T]: ForkResult<T[Key]> }
  : never

/**
 * Paginate the same selector
 *
 * @category Selector
 * @since 1.0.0
 * @param a shear.
 * @param b fallback shear or value
 */
export const each = <R extends any[], A, N>(shear: Shear<R, A, N>): Shear<R, A[], N> =>
  pipe(
    ask<Context<R, N>>(),
    chain((x) => A.array.traverse(readerTaskEither)(x.data, (y) => (z) => shear({ ...z, data: y })))
  )

/**
 * Paginate the same selector
 *
 * @category Selector
 * @since 1.0.0
 * @param a shear.
 * @param b fallback shear or value
 */
export const getOrElse = <A, B, C, N>(a: Shear<A, B, N>, b: C | Shear<A, C, N>) =>
  readerTaskEither.alt<Context<A, N>, string, B | C>(a, () => (is<Shear<A, C, N>>(is.function)(b) ? b : of(b)))

/**
 * Paginate the same selector
 *
 * @category Selector
 * @since 1.0.0
 * @param a shear.
 * @param b fallback shear or value
 */
export const partial = <N>() => <A, B>(a: Shear<A, B, N>): Shear<A, B, N> => a

// /**
//  * Paginate the same selector
//  *
//  * @category Selector
//  * @since 1.0.0
//  * @param a shear.
//  */
// export const debug = <T>(r: Context<T>) => () => {
//   console.log(r)
//   return r
// }

// /**
//  * Map over current context value
//  *
//  * @category Selector
//  * @since 1.0.0
//  * @param a shear.
//  */
// export const mapData = <R, B>(fn: (x: R) => B): Shear<R, B> => context(map((x: Context<R>) => fn(x.data)))

// /**
//  * Paginate the same selector
//  *
//  * @category Selector
//  * @since 1.0.0
//  * @param a shear.
//  * @param b fallback shear or value
//  */
// export const tryEach = <R extends any[], A>(shear: Shear<R, A>): Shear<R, A[]> =>
//   pipe(
//     ask<Context<R>>(),
//     chain((x) =>
//       array.traverse(readerTaskEither)(x.data, (y) =>
//         readerTaskEither.alt(
//           (z) => shear({ ...z, data: y }),
//           () => of(null)
//         )
//       )
//     ),
//     map((y) => y.filter((z) => z !== null) as A[])
//   )

export const is = <T extends any>(fn: (x: unknown) => boolean) => (x: unknown): x is T => fn(x)
is.object = is<Record<any, any>>((x) => typeof x === 'object' && !Array.isArray(x) && x !== null)
is.function = is<Function>((x) => typeof x === 'function')
is.string = is<string>((x) => typeof x === 'string')
is.array = is<any[]>((x) => Array.isArray(x))
