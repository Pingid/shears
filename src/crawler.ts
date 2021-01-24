import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/lib/function'
import * as TE from 'fp-ts/TaskEither'

import { Node, Shear, error, _Error, Connection } from './shear'
import { is } from './utility'

/**
 * Go to a URL and return HTML AST.
 *
 * @since 1.0.0
 * @param fetch Accepts a url and returns html/xml string.
 */
export const goTo: <R, A>(url: string | Shear<R, string>, shear: Shear<Node | Node[], A>) => Shear<R, A> = (
  url,
  shear
) => (r) =>
  pipe(
    r.connection,
    (connecton) =>
      is<Connection<any>>((x) => x !== undefined)(connecton)
        ? TE.right<_Error, Connection<unknown>>(connecton)
        : TE.left(error('Must provide a connection object')),
    TE.chain(({ fetch }) =>
      pipe(
        is.function(url) && r ? url(r) : TE.of(url as string),
        TE.chain((y) =>
          pipe(
            TE.tryCatch(
              () => fetch(y, r.connection?.ctx),
              (err) => error(`${err}`)
            ),
            TE.map((x) => {
              const stack = `${r.stack} \n (${y})`
              if (is.string(x)) return { ...r, stack, data: r.parser(x) }
              if (is<Node>((y) => y instanceof Node)(x) || is.array(x)) return { ...r, stack, data: x }
              return { ...r, ctx: x.ctx, stack, data: r.parser(x.markup) }
            }),
            TE.chain(shear)
          )
        )
      )
    )
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
export const paginate: <A>(
  url: string | Shear<Node | Node[], string>,
  limit: number,
  follow: Shear<Node | Node[], A>,
  results?: A[]
) => Shear<Node | Node[], A[]> = (url, limit, follow, results = []) =>
  pipe(
    follow,
    RTE.chain((x) => {
      if (limit <= 0) return RTE.right([...results, x])
      return pipe(
        goTo(url, paginate(url, limit - 1, follow, [...results, x])),
        RTE.alt(() => RTE.right([...results, x]))
      )
    })
  )
