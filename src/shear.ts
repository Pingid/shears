import { Applicative2 } from 'fp-ts/lib/Applicative'
import { Alternative2 } from 'fp-ts/lib/Alternative'
import { Functor2 } from 'fp-ts/lib/Functor'
import { tuple } from 'fp-ts/lib/function'
import { Monad2 } from 'fp-ts/lib/Monad'
import f from 'fp-ts/HKT'

import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'

import { Node } from 'domhandler'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 0.1.0
 */
export interface Shear<R, A, B> {
  (r: {
    next: (input: A, next: R) => TE.TaskEither<Error, { data: Node | Node[]; context: R }>
    context: R
    current: A
  }): TE.TaskEither<string, B>
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.1.0
 */
export const fromIO: <R, A>(ma: IO<A>) => ReaderIO<R, A> = T.fromM

/**
 * @category constructors
 * @since 0.1.10
 */
export const fromIOK: <A extends Array<unknown>, B>(f: (...a: A) => IO<B>) => <R>(...a: A) => ReaderIO<R, B> = (f) => (
  ...a
) => fromIO(f(...a))

/**
 * @category constructors
 * @since 0.1.0
 */
export const fromReader: <R, A>(ma: Reader<R, A>) => ReaderIO<R, A> = T.fromReader

/**
 * @category constructors
 * @since 0.1.0
 */
export const ask: <R>() => Shear<R, R> = RTE.ask

/**
 * @category constructors
 * @since 0.1.0
 */
export const asks: <R, A>(f: (r: R) => A) => ReaderIO<R, A> = T.asks

// export declare type URI = typeof URI
// declare module 'fp-ts/HKT' {
//   interface URItoKind3<R, E, A> {
//     readonly [URI]: Shear<R, E, A>
//   }
// }

// // export type Shear<I, O> = (input: I) => [O, I][];
// // export const parse = <I, O>(p: Parser<I, O>): Parser<I, O> => (i: I) => p(i);

// export type Error = string
// export type Parsed = Node | Node[]

// export type Network<A, N> = (input: A, next: N) => TE.TaskEither<Error, { data: Parsed; next: N }>

// export type Context<T, N> = { get: Network<string, N>; next: N; data: T }
// export type Shear<R, A, N> = ReaderTaskEither<Context<R, N>, Error, A>
