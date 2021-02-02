import { Node } from 'domhandler'
import * as cs from 'css-select'

import { fromNullable } from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import * as A from 'fp-ts/Array'

import { Context, Shear } from '../shear'
import { QueryError } from '../error'

/**
 * Finds the first node to match a CSS query string.
 *
 * @category Selector
 * @since 1.0.0
 * @param {string} selector - CSS selector query
 * @param {Shear} next - Shear selector handed selectod node
 */
export const query: {
  (selector: string): Shear<Node[] | Node, Node>
  <A>(selector: string, next: Shear<Node, A>): Shear<Node[] | Node, A>
} = (selector: string, next?: Shear<Node, any>) =>
  pipe(new QueryError(`Failed to find node: (${selector})`, $), (error) =>
    pipe(
      RTE.ask<Context<Node | Node[]>>(),
      RTE.chain((r) => () =>
        pipe(
          cs.selectOne(selector, r.data),
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
