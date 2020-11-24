import { fromTaskEither, chain, ask } from 'fp-ts/lib/ReaderTaskEither'
import * as TE from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/pipeable'

import { parseDOM } from 'htmlparser2'

import { Parsed, Shear, Context } from './types'
import { is } from './utility'

/**
 * Run a shear
 *
 * @since 1.0.0
 * @param fetch connect to network
 * @param shear selector.
 */
export const run = <C, A>(
  fetch: (url: string, last: C) => TE.TaskEither<string, { html: string; next: C }>,
  next: C,
  shear: Shear<Parsed, A, C>,
  parser?: typeof parseDOM
) =>
  shear({
    get: (url, last) =>
      pipe(
        fetch(url, last),
        TE.map((x) => ({ data: (parser || parseDOM)(x.html), next: x.next }))
      ),
    data: [],
    next,
  })

/**
 * Go to a URL and return HTML AST.
 *
 * @since 1.0.0
 * @param url Shear<string> or string url.
 */
export const goTo = <R, A, C>(url: string | Shear<R, string, C>, shear: Shear<Parsed, A, C>): Shear<R, A, C> => (r) =>
  pipe(
    is.function(url) && r ? url(r) : TE.of(url as string),
    TE.chain((y) => (!r.get ? TE.left('') : r.get(y, r?.next))),
    TE.chain((y) => shear({ ...r, ...y }))
  )

/**
 * Paginate on a url selector stop when it fails or reaches the iteration limit
 *
 * @category Selector
 * @since 1.0.0
 * @param url string or Selector passed to the @ref goTo function
 * @param limit number of times to attempt to paginate
 * @param follow selector executed on each iteration
 */
export const paginate = <T, N>(
  url: string | Shear<Parsed, string, N>,
  limit: number,
  follow: Shear<Parsed, T, N>,
  results: T[] = []
): Shear<Parsed, T[], N> =>
  pipe(
    ask<Context<Parsed, N>>(),
    chain((y) =>
      pipe(
        follow(y),
        TE.chain((x) => {
          if (limit <= 0) return TE.right([...results, x])
          return TE.taskEither.alt(goTo(url, paginate(url, limit - 1, follow, [...results, x]))(y), () =>
            TE.right([...results, x])
          )
        }),
        (x) => fromTaskEither(x)
      )
    )
  )
