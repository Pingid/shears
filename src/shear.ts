import * as DH from 'domhandler'
import { parseDOM } from 'htmlparser2'

import * as RTE from 'fp-ts/ReaderTaskEither'
import { TaskEither } from 'fp-ts/TaskEither'

export class Node extends DH.Node {}

export type _Error = Error

export interface Connection<T> {
  readonly fetch: (url: string, ctx: T) => Promise<Node | Node[] | string | { markup: string; ctx: T }>
  readonly ctx: T
}

export type Context<R, A = unknown> = {
  data: R
  parser: typeof parseDOM
  connection?: Connection<A>
  stack: string
}

export interface Shear<R, A> extends RTE.ReaderTaskEither<Context<R>, _Error, A> {}

export const error = (message: string) => new Error(message)

/**
 * Run a shear
 *
 * @since 1.0.0
 * @param shear selector.
 */
export const run: <T>(
  shear: Shear<Node | Node[], T>,
  markup?: string,
  context?: Partial<Context<Node | Node[], any>>
) => TaskEither<_Error, T> = (shear, markup, context) =>
  shear({
    data: context?.data || (markup !== undefined ? (context?.parser || parseDOM)(markup) : []),
    parser: context?.parser || parseDOM,
    connection: context?.connection,
    stack: `${shear.name}`
  })

/**
 * Create network driver
 *
 * @since 1.0.0
 */
export const connect: {
  (fetch: Connection<undefined>['fetch']): Connection<undefined>
  <T>(fetch: Connection<T>['fetch'], ctx: T): Connection<T>
} = (fetch: any, ctx?: any) => ({ fetch, ctx })

export const ask = RTE.ask<Context<Node | Node[]>>()
export const map = RTE.map
export const chain = RTE.chain
