import * as DH from 'domhandler'
import { parseDOM } from 'htmlparser2'

import * as RTE from 'fp-ts/ReaderTaskEither'
import { TaskEither } from 'fp-ts/TaskEither'

export class Node extends DH.Node {}

class _Error extends Error {
  constructor(message?: string, fn?: Function) {
    super(message)
    Error.captureStackTrace(this, fn)
  }
}
export const createErrorStack = (fn?: Function) => {
  const error = new _Error('', fn || createErrorStack)
  return (message?: string) => {
    error.message = message || error.message
    return error
  }
}

export const createErrorStackMap = (fn?: Function, message?: string) => {
  const stackError = new _Error(message, fn || createErrorStack)
  return (_error?: Error | string) => {
    if (typeof _error === 'string') {
      const err = new Error(_error)
      err.stack = stackError.stack
      return err
    }
    if (_error instanceof Error) {
      _error.stack = stackError.stack
      return _error
    }
    return stackError
  }
}

export const shear: <R, A>(
  fn: RTE.ReaderTaskEither<Context<R>, string | undefined | Error, A>,
  _fn?: Function,
  message?: string
) => Shear<R, A> = (fn, ref, message) => {
  const _error = createErrorStackMap(ref || shear, message)
  return RTE.readerTaskEither.mapLeft(fn, _error)
}

export const createShear = <A extends any[], R, B>(fn: (...args: A) => Shear<R, B>, ref: Function) => (...args: A) =>
  shear(fn(...args), ref)

export interface Connection<T> {
  readonly fetch: (url: string, ctx: T) => Promise<Node | Node[] | string | { markup: string; ctx: T }>
  readonly ctx: T
}

export type Context<R, A = unknown> = {
  data: R
  parser: typeof parseDOM
  connection?: Connection<A>
}

export interface Shear<R, A> extends RTE.ReaderTaskEither<Context<R>, _Error, A> {}

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
    connection: context?.connection
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
export const map = RTE.readerTaskEither.map
export const chain = RTE.chain
