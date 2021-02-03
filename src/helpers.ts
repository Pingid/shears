import serialize from 'dom-serializer'
import { Node } from 'domhandler'

import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/pipeable'

import { $, attributes, text } from './selectors'
import { createErrorStackMap } from './error'
import { Shear } from './shear'
import { is } from './utility'

/**
 * Finds the first node to match a CSS query string.
 *
 * @category Selector
 * @since 1.0.0
 * @param query CSS selector string.
 */
export const createShear: <B, C>(fn: Shear<B, C>, ref: Function, errorMessage?: string) => Shear<B, C> = (
  fn,
  ref,
  errorMessage
) => pipe(createErrorStackMap(ref, errorMessage), (error) => pipe(fn, RTE.mapLeft(error)))

/**
 * Combines query and text selectors
 *
 * @category Selector
 * @since 1.0.0
 * @param query CSS selector string.
 * @alias qt
 */
export const queryText: {
  <A>(query: string): Shear<Node | Node[], string>
  <A>(query: string, fn: (x: string) => A): Shear<Node | Node[], A>
} = (query: string, fn?: (x: string) => any) => createShear($(query, fn ? text(fn) : text()), queryText)

/**
 * @alias queryText
 */
export const qt = queryText

/**
 * Combines query and attribue selectors
 *
 * @category Selector
 * @since 1.0.0
 * @param query CSS selector string.
 */
export const queryAttribute: (query: string, attribute: string) => Shear<Node | Node[], string> = (
  query: string,
  attribute: string
) => createShear($(query, attributes(attribute)), queryAttribute)

export const qa = queryAttribute

/**
 * Finds the first node to match a CSS query string.
 *
 * @category Selector
 * @since 1.0.0
 * @param query CSS selector string.
 */
export const debug = (): Shear<unknown, void> => (r) => {
  const data = r.data
  if (is<Node>((x) => x instanceof Node)(data)) throw serialize(data as any)
  if (is<Node[]>((x) => is.array(x) && x[0] instanceof Node)(data)) throw serialize(data as any)
  throw JSON.stringify(data)
}
