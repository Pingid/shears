import { parseDOM } from 'htmlparser2'
import { Node } from 'domhandler'

import * as RTE from 'fp-ts/ReaderTaskEither'
import { TaskEither } from 'fp-ts/TaskEither'

import { createErrorStackMap } from './error'
import { Connection } from './crawler'

export type Context<R, A = unknown> = {
  readonly data: R
  readonly parser: typeof parseDOM
  readonly connection?: Connection<A>
}

export const shear: <R, A>(
  fn: RTE.ReaderTaskEither<Context<R>, Error, A>,
  _fn?: Function,
  message?: string
) => Shear<R, A> = (fn, ref, message) => {
  const _error = createErrorStackMap(ref || shear, message)
  return RTE.readerTaskEither.mapLeft(fn, _error)
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
  markup?: string,
  context?: Partial<Context<Node | Node[], any>>
) => TaskEither<Error, T> = (shear, markup, context) =>
  shear({
    data: context?.data || (markup !== undefined ? (context?.parser || parseDOM)(markup) : []),
    parser: context?.parser || parseDOM,
    connection: context?.connection
  })
