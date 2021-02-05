import { parseDOM } from 'htmlparser2'
import * as DH from 'domhandler'

import { sequenceS, sequenceT } from 'fp-ts/lib/Apply'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { TaskEither } from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/lib/pipeable'
import * as A from 'fp-ts/Array'

import { Connection } from './crawler'
import { is } from './utility'

export type Node = DH.Node
export type Context<R, A = unknown> = {
  readonly data: R
  readonly parser: typeof parseDOM
  readonly connection?: Connection<A>
}

export interface Shear<R, A> extends RTE.ReaderTaskEither<Context<R>, Error, A> {}

/**
 * Run a shear
 *
 * @since 1.0.0
 * @param shear selector.
 */
export const run: <T>(
  shear: Shear<Node | Node[], T>,
  markupOrContext?: string | Partial<Context<Node | Node[], any>>
) => TaskEither<Error, T> = (shear, markupOrContext) => {
  if (is.string(markupOrContext)) return shear({ data: parseDOM(markupOrContext), parser: parseDOM })
  return shear({
    data: markupOrContext?.data || [],
    parser: markupOrContext?.parser || parseDOM,
    connection: markupOrContext?.connection
  })
}

/**
 * Join shears in series
 *
 * @example
 *
 * const innerText = join($('h1'), text);
 *
 * @since 1.0.0
 * @params Shear[]
 */
export const join: Join = (...[head, ...tail]: any[]) =>
  !head
    ? RTE.readerTaskEither.map(RTE.ask<Context<any>>(), (x) => x.data)
    : RTE.readerTaskEither.chain(head, (x) => (y: any) => join(...(tail as [Shear<any, any>]))({ ...y, data: x }))

type Join = {
  (): Shear<any, any>
  <R, A>(a: Shear<R, A>): Shear<R, A>
  <R, A, B>(a: Shear<R, A>, b: Shear<A, B>): Shear<R, B>
  <R, A, B, C>(a: Shear<R, A>, b: Shear<A, B>, c: Shear<B, C>): Shear<R, C>
  <R, A, B, C, D>(a: Shear<R, A>, b: Shear<A, B>, c: Shear<B, C>, d: Shear<C, D>): Shear<R, D>
  <R, A, B, C, D, E>(a: Shear<R, A>, b: Shear<A, B>, c: Shear<B, C>, d: Shear<C, D>, e: Shear<D, E>): Shear<E, R>
  <R, A, B, C, D, E, F>(
    a: Shear<R, A>,
    b: Shear<A, B>,
    c: Shear<B, C>,
    d: Shear<C, D>,
    e: Shear<D, E>,
    f: Shear<E, F>
  ): Shear<R, F>
  <R, A, B, C, D, E, F, G>(
    a: Shear<R, A>,
    b: Shear<A, B>,
    c: Shear<B, C>,
    d: Shear<C, D>,
    e: Shear<D, E>,
    f: Shear<E, F>,
    g: Shear<F, G>
  ): Shear<R, G>
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
export const fork: <T extends Forked>(fork: T) => Shear<Node[] | Node, ForkResult<T>> = (_fork) => {
  if (is<Shear<any, any>>(is.function)(_fork)) return _fork
  if (is<Shear<any, any>[]>(is.array)(_fork)) return sequenceT(RTE.readerTaskEither)(...(_fork as any)) as any
  if (is<{ [x: string]: Forked<any> }>(is.shape)(_fork)) return sequenceS(RTE.readerTaskEither)(_fork as any) as any
}

type Forked<T = any, R = any> = Shear<T, R> | ReadonlyArray<Shear<T, R>> | { [x: string]: Shear<T, R> }
type ForkResult<T extends Forked> = T extends Shear<any, infer D>
  ? D
  : T extends ReadonlyArray<Shear<any, any>>
  ? { [K in keyof T]: [T[K]] extends [Forked<any, infer A>] ? A : never }
  : T extends { [x: string]: Shear<any, any> }
  ? { [K in keyof T]: [T[K]] extends [Forked<any, infer A>] ? A : never }
  : never

/**
 * Run the same selector on an array of Nodes
 *
 * @category Selector
 * @since 1.0.0
 * @param a shear.
 * @param b fallback shear or value
 */
export const each: <R, A>(shear: Shear<R, A>) => Shear<R[], A[]> = (_shear) =>
  pipe(
    RTE.ask<Context<any[]>>(),
    RTE.chain((x) => A.array.traverse(RTE.readerTaskEither)(x.data, (y) => (z) => _shear({ ...z, data: y })))
  )

/**
 * Paginate the same selector
 *
 * @category Selector
 * @since 1.0.0
 * @param a shear.
 * @param b fallback shear or value
 */
export const getOrElse: <A, B, C>(a: Shear<A, B>, b: C | Shear<A, C>) => Shear<A, B | C> = (a, b) =>
  RTE.readerTaskEither.alt(a, () => (is<Shear<any, any>>(is.function)(b) ? b : RTE.of(b)))

export const nullable: {
  <A, B>(a: Shear<A, B>): Shear<A, B | null>
} = (a) => RTE.readerTaskEither.alt(a, () => RTE.right(null))
