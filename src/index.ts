import { Node, Element } from 'domhandler'
import serialize from 'dom-serializer'
import { parseDOM } from 'htmlparser2'
import * as cs from 'css-select'
import * as du from 'domutils'

import { sequenceS, sequenceT } from 'fp-ts/Apply'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/lib/function'
import * as TE from 'fp-ts/TaskEither'
import * as A from 'fp-ts/Array'

export type Error = string
export type Parsed = Node | Node[]
export type Context<R, A = unknown> = { data: R; ctx: A }

export interface Shear<R, A> extends RTE.ReaderTaskEither<Context<R>, Error, A> {}

/**
 * Finds the first node to match a CSS query string.
 *
 * @category Selector
 * @since 1.0.0
 * @param query CSS selector string.
 */
export const $: (query: string) => Shear<Parsed, Node> = (query: string) => (r) =>
  pipe(cs.selectOne(query, r.data), (y) => (y ? TE.right(y) : TE.left(`Cant find node matching query ${query}`)))

/**
 * Finds all nodes matching a CSS query string.
 *
 * @category Selector
 * @since 1.0.0
 * @param query CSS selector string.
 */
export const $$: (query: string) => Shear<Parsed, Node[]> = (cssSelector: string) => (r) =>
  TE.right(cs.selectAll(cssSelector, r.data))

/**
 * Get the parent node
 *
 * @category Selector
 * @since 1.0.0
 */
export const parent: Shear<Node, Node> = (r) =>
  pipe(du.getParent(r.data), (x) => (x === null ? TE.left('Node has no parent') : TE.right(x)))

/**
 * Get the siblings of the node including the current node.
 *
 * @category Selector
 * @since 1.0.0
 */
export const siblings: Shear<Node, Node[]> = (r) =>
  pipe(du.getSiblings(r.data), (x) => (x === null ? TE.left('Node has no parent') : TE.right(x)))

/**
 * Get the children of the node.
 *
 * @category Selector
 * @since 1.0.0
 */
export const children: Shear<Node, Node[]> = (r) => pipe(du.getChildren(r.data), TE.right)

/**
 * Get the next sibling lying adjecent or bellow the current node
 *
 * @category Selector
 * @since 1.0.0
 */
export const nextSibling: Shear<Node, Node> = (r) =>
  pipe(du.nextElementSibling(r.data), (x) => (x === null ? TE.left('Node has no parent') : TE.right(x)))

/**
 * Get the text content of the node, and its children if it has any.
 *
 * @category Selector
 * @since 1.0.0
 */
export const text: Shear<Parsed, string> = (r) => TE.right(du.getText(r.data))

/**
 * Get the serialised html.
 *
 * @category Selector
 * @since 1.0.0
 */
export const html: Shear<Parsed, string> = (r) => TE.right(serialize(r.data))

/**
 * Get any attributes from a Node.
 *
 * @category Selector
 * @since 1.0.0
 */
export const attributes: Shear<Node, { [x: string]: string }> = (r) =>
  r.data instanceof Element ? TE.right(r.data.attribs) : TE.left(`No attributes exist node type ${r.data.nodeType}`)

/**
 * Select a particular attribute from a Node.
 *
 * @category Selector
 * @since 1.0.0
 */
export const attr: (prop: string) => Shear<Node, string> = (prop) => (r) =>
  pipe(
    attributes(r),
    TE.chain((x) =>
      x[prop] === undefined
        ? TE.left(`Attribute ${prop} doesn't exist in attributes ${JSON.stringify(x, null, 2)}`)
        : TE.right(x[prop])
    )
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
export const fork: <T extends Forked>(fork: T) => Shear<Parsed, ForkResult<T>> = (fork) => {
  if (is<Shear<any, any>>(is.function)(fork)) return fork
  if (is<Shear<any, any>[]>(is.array)(fork)) return sequenceT(RTE.readerTaskEither)(...(fork as any)) as any
  if (is<{ [x: string]: Forked<any> }>(is.object)(fork)) return sequenceS(RTE.readerTaskEither)(fork as any) as any
  throw new Error(`Select does not accept a selector of ${typeof fork}`)
}

type Forked<T = any, R = any> = Shear<T, R> | Shear<T, R>[] | { [x: string]: Shear<T, R> }
type ForkResult<T extends Forked> = T extends Shear<any, infer D>
  ? D
  : T extends Shear<any, any>[]
  ? {
      [I in keyof T]: ForkResult<Extract<T[I], T[number]>> // Extract is needed here
    }
  : T extends { [x: string]: Shear<any, any> }
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
export const each: <R extends any[], A>(shear: Shear<R[number], A>) => Shear<R, A[]> = (shear) =>
  pipe(
    RTE.ask<Context<any>>(),
    RTE.chain((x) => A.array.traverse(RTE.readerTaskEither)(x.data, (y) => (z) => shear({ ...z, data: y })))
  )

/**
 * Paginate the same selector
 *
 * @category Selector
 * @since 1.0.0
 * @param a shear.
 * @param b fallback shear or value
 */
export const getOrElse = <A, B, C>(a: Shear<A, B>, b: C | Shear<A, C>) =>
  RTE.readerTaskEither.alt<Context<A>, string, B | C>(a, () => (is<Shear<A, C>>(is.function)(b) ? b : RTE.of(b)))

/**
 * Run a shear
 *
 * @since 1.0.0
 * @param fetch connect to network
 * @param shear selector.
 */
export const run = <T>(shear: Shear<Parsed, T>, markup?: string, ctx?: unknown) =>
  shear({ data: markup !== undefined ? parseDOM(markup) : [], ctx })

export const connect: (
  fetch: (url: string, ctx: unknown) => Promise<{ markup: string; ctx: unknown }>,
  parser?: typeof parseDOM
) => <R, A>(url: string | Shear<R, string>, shear: Shear<Parsed, A>) => Shear<R, A> = (fetch, parser = parseDOM) => (
  url,
  shear
) => (r) =>
  pipe(
    is.function(url) && r ? url(r) : TE.of(url as string),
    TE.chain((y) =>
      TE.tryCatch(
        () => fetch(y, r.ctx),
        (error) => `${error}`
      )
    ),
    TE.chain((x) => shear({ ctx: x.ctx, data: parser(x.markup) }))
  )
/**
 * Go to a URL and return HTML AST.
 *
 * @since 1.0.0
 * @param url Shear<string> or string url.
 */
// export const goTo = <R, A, C>(
//   url: string | Shear<R, string, C>,
//   shear: Shear<Parsed, A, C>,
// ): Shear<R, A, C> => (r) =>
//   pipe(
//     is.function(url) && r ? url(r) : TE.of(url as string),
//     TE.chain((y) => (!r.get ? TE.left("") : r.get(y, r?.next))),
//     TE.chain((y) => shear({ ...r, ...y }))
//   );

/**
 * Paginate on a url selector stop when it fails or reaches the iteration limit
 *
 * @category Selector
 * @since 1.0.0
 * @param url string or Selector passed to the @ref goTo function
 * @param limit number of times to attempt to paginate
 * @param follow selector executed on each iteration
 */
// export const paginate = <T>(
//   url: string | Shear<Parsed, string>,
//   limit: number,
//   follow: Shear<Parsed, T>,
//   results: T[] = []
// ): Shear<Parsed, T[]> =>
//   pipe(
//     RTE.ask<Context<Parsed>>(),
//     RTE.chain((y) =>
//       pipe(
//         follow(y),
//         TE.chain((x) => {
//           if (limit <= 0) return TE.right([...results, x]);
//           return TE.taskEither.alt(
//             goTo(url, paginate(url, limit - 1, follow, [...results, x]))(y),
//             () => TE.right([...results, x])
//           );
//         }),
//         (x) => RTE.fromTaskEither(x)
//       )
//     )
//   );

// -------------------------------------------------------------------------------------
// Type guard utility
// -------------------------------------------------------------------------------------
export const is = <T extends any>(fn: (x: unknown) => boolean) => (x: unknown): x is T => fn(x)
is.object = is<Record<any, any>>((x) => typeof x === 'object' && !Array.isArray(x) && x !== null)
is.function = is<Function>((x) => typeof x === 'function')
is.string = is<string>((x) => typeof x === 'string')
is.array = is<any[]>((x) => Array.isArray(x))
