import serialize, { DomSerializerOptions } from 'dom-serializer'
import { Node, Element } from 'domhandler'
import * as cs from 'css-select'
import * as du from 'domutils'

import { fromNullable } from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import * as A from 'fp-ts/Array'

import { Context, Shear } from './shear'
import { QueryError } from './error'

/**
 * Finds the first node to match a CSS query string.
 *
 * @category Selector
 * @since 1.0.0
 * @param {string} query - CSS selector query
 * @param {Shear} next - Shear selector handed selectod node
 */
export const query: {
  (query: string): Shear<Node[] | Node, Node>
  <A>(query: string, next: Shear<Node, A>): Shear<Node[] | Node, A>
} = (query: string, next?: Shear<Node, any>) =>
  pipe(new QueryError(`Failed to find node: (${query})`, $), (error) =>
    pipe(
      RTE.ask<Context<Node | Node[]>>(),
      RTE.chain((r) => () =>
        pipe(
          cs.selectOne(query, r.data),
          fromNullable(error),
          TE.fromEither,
          TE.chain((data) => (next ? next({ ...r, data }) : TE.right(data)))
        )
      )
    )
  )

/**
 * Finds the first node to match a CSS query string.
 *
 * @category Selector
 * @since 1.0.0
 * @alias query
 * @param {string} query - CSS selector query
 * @param {Shear} next - Shear selector handed selectod node
 */
export const $ = query

/**
 * Finds all nodes matching a CSS query string.
 *
 * @category Selector
 * @since 1.0.0
 * @param query CSS selector string.
 */
export const queryAll: {
  (query: string): Shear<Node[] | Node, Node[]>
  <A>(query: string, _shear: Shear<Node, A>): Shear<Node[] | Node, A[]>
} = (query: string, _shear?: Shear<Node, any>) =>
  pipe(
    RTE.ask<Context<Node | Node[]>>(),
    RTE.chain((r) => () =>
      pipe(cs.selectAll(query, r.data), (data) =>
        _shear ? A.array.traverse(TE.taskEither)(data, (data) => _shear({ ...r, data })) : TE.right<Error, Node[]>(data)
      )
    )
  )
export const $$ = queryAll

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
  pipe(new QueryError(`Node has no parent`, parent), (error) =>
    pipe(
      RTE.ask<Context<Node>>(),
      RTE.chain((r) => () =>
        pipe(
          du.getParent(r.data),
          fromNullable(error),
          TE.fromEither,
          TE.chain((data) => (_shear ? _shear({ ...r, data }) : TE.right(data)))
        )
      )
    )
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
  pipe(
    RTE.ask<Context<Node>>(),
    RTE.chain((r) => () =>
      pipe(du.getSiblings(r.data), (data) =>
        _shear ? A.array.traverse(TE.taskEither)(data, (data) => _shear({ ...r, data })) : TE.right(data)
      )
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
  pipe(
    RTE.ask<Context<Node>>(),
    RTE.chain((r) => () =>
      pipe(du.getChildren(r.data), (data) =>
        _shear ? A.array.traverse(TE.taskEither)(data, (data) => _shear({ ...r, data })) : TE.right(data)
      )
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
  pipe(new QueryError(`Node has no next sibling`, nextSibling), (error) =>
    pipe(
      RTE.ask<Context<Node>>(),
      RTE.chain((r) => () =>
        pipe(
          du.nextElementSibling(r.data),
          fromNullable(error),
          TE.fromEither,
          TE.chain((data) => (_shear ? _shear({ ...r, data }) : TE.right(data)))
        )
      )
    )
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
  pipe(
    RTE.ask<Context<Node | Node[]>>(),
    RTE.map((r) => pipe(du.getText(r.data), (x) => (fn ? fn(x) : x)))
  )

/**
 * Get the serialised html.
 *
 * @category Selector
 * @since 1.0.0
 */
export const html: (options?: DomSerializerOptions) => Shear<Node[] | Node, string> = (options) =>
  pipe(
    RTE.ask<Context<Node | Node[]>>(),
    RTE.map((r) => serialize(r.data, options))
  )

/**
 * Get any attributes from on a Node.
 *
 * @category Selector
 * @since 1.0.0
 */
export const attributes: () => Shear<Node, { [x: string]: string }> = () =>
  pipe(new QueryError(`No attributes exist node`, attributes), (error) =>
    pipe(
      RTE.ask<Context<Node>>(),
      RTE.chain((r) => () => (r.data instanceof Element ? TE.right(r.data.attribs) : TE.left(error)))
    )
  )

/**
 * Select a particular attribute from a Node.
 *
 * @category Selector
 * @since 1.0.0
 */
export const attr: (prop: string) => Shear<Node, string> = (prop) =>
  pipe(new QueryError(`Node doesn't have attribute (${prop})`, attr), (error) =>
    pipe(
      RTE.ask<Context<Node>>(),
      RTE.chain((r) => () =>
        pipe(
          attributes()(r),
          TE.chain((x) => (x[prop] === undefined ? TE.left(error) : TE.right(x[prop])))
        )
      )
    )
  )
