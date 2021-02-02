import serialize, { DomSerializerOptions } from 'dom-serializer'
import { Node, Element } from 'domhandler'
import * as du from 'domutils'

import { fromNullable } from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import * as A from 'fp-ts/Array'

import { Context, Shear } from '../shear'
import { QueryError } from '../error'
import { is } from '../utility'

/**
 * Get first element
 *
 * @category Selector
 * @since 1.0.0
 */
export const first: {
  (): Shear<Node | Node[], Node>
  <A>(_shear: Shear<Node, A>): Shear<Node | Node[], A>
} = (_shear?: Shear<Node, any>) =>
  pipe(new QueryError(`No elements found`, first), (error) =>
    pipe(
      RTE.ask<Context<Node | Node[]>>(),
      RTE.chain((r) => () =>
        pipe(
          is.array(r.data) ? r.data[0] : r.data,
          fromNullable(error),
          TE.fromEither,
          TE.chain((data) => (_shear ? _shear({ ...r, data }) : TE.right(data)))
        )
      )
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
 * Select a particular attribute from a Node.
 *
 * @category Selector
 * @since 1.0.0
 */
export const attributes: {
  (): Shear<Node, string>
  (prop: string): Shear<Node, string>
  <T>(prop: (x: { [x: string]: string }) => T): Shear<Node, T>
} = (prop?: string | ((x: { [x: string]: string }) => any)) =>
  pipe(new QueryError(`Node doesn't have attribute (${prop})`, attributes), (error) =>
    pipe(
      RTE.ask<Context<Node>>(),
      RTE.chain((r) => () =>
        pipe(
          r.data instanceof Element ? TE.right(r.data.attribs) : TE.left<QueryError, never>(error),
          TE.chain((y) => {
            if (is.falsy(prop)) return TE.right(y)
            if (is.string(prop)) return y[prop] === undefined ? TE.left(error) : TE.right(y[prop])
            return TE.right(prop(y))
          })
        )
      )
    )
  )

/**
 * Select a particular attribute from a Node.
 *
 * @category Selector
 * @since 1.0.0
 */
export const attr = attributes
