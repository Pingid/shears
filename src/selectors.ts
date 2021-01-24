import serialize, { DomSerializerOptions } from 'dom-serializer'
import { Node, Element } from 'domhandler'
import * as cs from 'css-select'
import * as du from 'domutils'

import { sequenceS, sequenceT } from 'fp-ts/Apply'
import { fromNullable } from 'fp-ts/lib/Either'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/lib/function'
import * as TE from 'fp-ts/TaskEither'
import * as A from 'fp-ts/Array'

import { Context, Shear, shear } from './shear'
import { is } from './utility'

/**
 * Finds the first node to match a CSS query string.
 *
 * @category Selector
 * @since 1.0.0
 * @param query CSS selector string.
 */
export const $: {
  (query: string): Shear<Node[] | Node, Node>
  <A>(query: string, next: Shear<Node, A>): Shear<Node[] | Node, A>
} = (query: string, next?: Shear<Node, any>) =>
  shear(
    (r: Context<Node[] | Node>) =>
      pipe(
        cs.selectOne(query, r.data),
        fromNullable(new Error(`Failed to find node: (${query})`)),
        TE.fromEither,
        TE.chain((data) => (next ? next({ ...r, data }) : TE.right(data)))
      ),
    $
  )

/**
 * Finds all nodes matching a CSS query string.
 *
 * @category Selector
 * @since 1.0.0
 * @param query CSS selector string.
 */
export const $$: {
  (query: string): Shear<Node[] | Node, Node[]>
  <A>(query: string, _shear: Shear<Node, A>): Shear<Node[] | Node, A[]>
} = (query: string, _shear?: Shear<Node, any>) =>
  shear<Node[] | Node, any>((r) =>
    pipe(cs.selectAll(query, r.data), (data) =>
      _shear ? A.array.traverse(TE.taskEither)(data, (data) => _shear({ ...r, data })) : TE.right<Error, Node[]>(data)
    )
  )

/**
 * Get node parent.
 *
 * @category Selector
 * @since 1.0.0
 */
export const parent: {
  (): Shear<Node, Node>
  <A>(_shear: Shear<Node, A>): Shear<Node, A>
} = (_shear?: Shear<Node, any>) =>
  shear<Node, any>(
    (r) =>
      pipe(
        du.getParent(r.data),
        fromNullable(new Error('Node has no parent')),
        TE.fromEither,
        TE.chain((data) => (_shear ? _shear({ ...r, data }) : TE.right(data)))
      ),
    parent
  )

/**
 * Get node including siblings.
 *
 * @category Selector
 * @since 1.0.0
 */
export const siblings: {
  (): Shear<Node, Node[]>
  <A>(_shear: Shear<Node, A>): Shear<Node, A[]>
} = (_shear?: Shear<Node, any>) =>
  shear<Node, any>((r) =>
    pipe(
      du.getSiblings(r.data),
      TE.right,
      TE.chain((data) => {
        if (!_shear) return TE.right(data)
        return A.array.traverse(TE.taskEither)(data, (data) => _shear({ ...r, data }))
      })
    )
  )

/**
 * Get node children.
 *
 * @category Selector
 * @since 1.0.0
 */
export const children: {
  (): Shear<Node, Node[]>
  <A>(_shear?: Shear<Node, A>): Shear<Node, A[]>
} = (_shear?: Shear<Node, any>) =>
  shear<Node, any>((r) =>
    pipe(
      du.getChildren(r.data),
      TE.right,
      TE.chain((data) => {
        if (!_shear) return TE.right(data)
        return A.array.traverse(TE.taskEither)(data, (data) => _shear({ ...r, data }))
      })
    )
  )

/**
 * Get adjecent node.
 *
 * @category Selector
 * @since 1.0.0
 */
export const nextSibling: {
  (): Shear<Node, Node>
  <A>(_shear: Shear<Node, A>): Shear<Node, A>
} = (_shear?: Shear<Node, any>) =>
  shear<Node, any>(
    (r) =>
      pipe(
        du.nextElementSibling(r.data),
        fromNullable(new Error('Node has no next sibling')),
        TE.fromEither,
        TE.chain((data) => (_shear ? _shear({ ...r, data }) : TE.right(data)))
      ),
    nextSibling
  )

/**
 * Get the text content.
 *
 * @category Selector
 * @since 1.0.0
 */
export const text: {
  (): Shear<Node[] | Node, string>
  <A>(fn: (x: string) => A): Shear<Node[] | Node, A>
} = (fn?: (x: any) => any) =>
  shear<Node | Node[], any>((r) =>
    pipe(
      du.getText(r.data),
      TE.right,
      TE.map((x) => (fn ? fn(x) : x))
    )
  )

/**
 * Get the serialised html.
 *
 * @category Selector
 * @since 1.0.0
 */
export const html: (options?: DomSerializerOptions) => Shear<Node[] | Node, string> = (options) => (r) =>
  TE.right(serialize(r.data, options))

/**
 * Get any attributes from on a Node.
 *
 * @category Selector
 * @since 1.0.0
 */
export const attributes: () => Shear<Node, { [x: string]: string }> = () =>
  shear(
    (r) =>
      r.data instanceof Element
        ? TE.right(r.data.attribs)
        : TE.left(new Error(`No attributes exist node type ${r.data.nodeType}`)),
    attributes
  )

/**
 * Select a particular attribute from a Node.
 *
 * @category Selector
 * @since 1.0.0
 */
export const attr: (prop: string) => Shear<Node, string> = (prop) =>
  shear(
    (r) =>
      pipe(
        attributes()(r),
        TE.chain((x) =>
          x[prop] === undefined
            ? TE.left(new Error(`Attribute ${prop} doesn't exist in attributes ${JSON.stringify(x, null, 2)}`))
            : TE.right(x[prop])
        )
      ),
    attr
  )

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
 * Paginate the same selector
 *
 * @category Selector
 * @since 1.0.0
 * @param a shear.
 * @param b fallback shear or value
 */
export const each: <R extends any[], A>(shear: Shear<R[number], A>) => Shear<R, A[]> = (_shear) =>
  pipe(
    RTE.ask<Context<any>>(),
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
// RTE.ReaderTaskEither<Context<A, unknown>, string, B | C>
export const getOrElse: <A, B, C>(a: Shear<A, B>, b: C | Shear<A, C>) => Shear<A, B | C> = (a, b) =>
  RTE.readerTaskEither.alt(a, () => (is<Shear<any, any>>(is.function)(b) ? b : RTE.of(b)))

export const nullable: <A, B>(a: Shear<A, B>) => Shear<A, B | null> = (a) =>
  RTE.readerTaskEither.alt(a, () => RTE.right(null))
