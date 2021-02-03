import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/lib/function'
import * as TE from 'fp-ts/TaskEither'
import * as T from 'fp-ts/Task'
import { Node } from 'domhandler'

import { Shear } from './shear'
import { is } from './utility'

export interface Connection<T> {
  readonly fetch: (
    url: string,
    ctx: T
  ) =>
    | Promise<Node | Node[] | string | { content: string; ctx: T }>
    | TE.TaskEither<Error, Node | Node[] | string | { content: string; ctx: T }>
  readonly ctx: T
}

/**
 * Create network driver
 *
 * @since 1.0.0
 */
export const connect: {
  (fetch: Connection<undefined>['fetch']): Connection<undefined>
  <T>(fetch: Connection<T>['fetch'], ctx: T): Connection<T>
} = (fetch: any, ctx?: any) => ({ fetch, ctx })

/**
 * Go to a URL and return HTML AST.
 *
 * @since 1.0.0
 * @param fetch Accepts a url and returns html/xml string.
 */
export const goTo: <R, A, T>(
  url: string | Shear<R, string>,
  shear: Shear<Node | Node[], A>,
  connection?: Connection<T>
) => Shear<R, A> = (url, shear, connection) => (r) =>
  pipe(
    r.connection || connection,
    (connecton) =>
      is<Connection<any>>((x) => x !== undefined)(connecton)
        ? TE.right<Error, Connection<unknown>>(connecton)
        : TE.left(new Error('Must provide a connection object')),
    TE.chain(({ fetch }) =>
      pipe(
        is.function(url) && r ? url(r) : TE.of(url as string),
        TE.chain((y) =>
          pipe(
            fetch(y, r.connection?.ctx),
            (y) =>
              is<Promise<any>>(is.object)(y)
                ? TE.tryCatch(
                    () => y,
                    (err) => new Error(`${err}`)
                  )
                : y,
            TE.map((x) => {
              if (is.string(x)) return { ...r, data: r.parser(x) }
              if (is<Node>((y) => y instanceof Node)(x) || is.array(x)) return { ...r, data: x }
              return { ...r, ctx: x.ctx, data: r.parser(x.content) }
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
export const paginate: <A, T>(
  url: string | Shear<Node | Node[], string>,
  limit: number,
  follow: Shear<Node | Node[], A>,
  connection?: Connection<T>,
  results?: A[]
) => Shear<Node | Node[], A[]> = (url, limit, follow, connection, results = []) =>
  pipe(
    follow,
    RTE.chain((x) => {
      if (limit <= 0) return RTE.right([...results, x])
      return pipe(
        goTo(url, paginate(url, limit - 1, follow, connection, [...results, x]), connection),
        RTE.alt(() => RTE.right([...results, x]))
      )
    })
  )
