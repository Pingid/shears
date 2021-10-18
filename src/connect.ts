import * as dh from 'domhandler'

import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/lib/function'
import * as TE from 'fp-ts/TaskEither'

import { is, ShearError } from './utility'
import { Shear } from './shear'

declare module './shear' {
  interface Context<R, A = unknown> {
    readonly connection?: Connection<A>
  }
}

// -------------------------------------------------------------------------------------
// Crawling
// -------------------------------------------------------------------------------------
interface Node extends dh.Node {}

export interface Connection<T> {
  readonly fetch: <E = Error>(
    url: string,
    ctx: T
  ) =>
    | Promise<Node | Node[] | string | [Node | Node[] | string, T]>
    | TE.TaskEither<E, Node | Node[] | string | [Node | Node[] | string, T]>
  readonly ctx: T
}

/**
 * Create network driver
 *
 * @since 0.0.1
 * @category Crawling
 */
export const connect: {
  (fetch: Connection<undefined>['fetch']): Connection<undefined>
  <T>(fetch: Connection<T>['fetch'], ctx: T): Connection<T>
} = (fetch: any, ctx?: any) => ({ fetch, ctx })

/**
 * Go to a URL and return HTML AST.
 *
 * @since 0.0.1
 * @category Crawling
 * @param fetch Accepts a url and returns html/xml string.
 */
export const goTo: <R, A, T>(
  url: string | Shear<R, Error, string>,
  shear: Shear<Node | Node[], Error, A>,
  connection?: Connection<T>
) => Shear<R, Error, A> = (url, shear, connection) => {
  const error = new ShearError(
    `No connection found in the parent context\nYou can provide it in your run functon or provide it as the third argument of goto\n\ngoTo('/foo', select('title'), select.connect({ your fetch implementation })`,
    goTo
  )
  return (r) => {
    const connect = connection || r.connection
    if (is.undefined(connect)) return TE.left(error)
    return pipe(
      is.string(url) ? TE.right(url) : url(r),
      TE.chain((y) =>
        pipe(
          connect.fetch(y, connect.ctx as any),
          (y) =>
            is<Promise<any>>(is.object)(y)
              ? TE.tryCatch(
                  () => y,
                  (err) => new Error(`${err}`)
                )
              : y,
          TE.map((x) => {
            if (is.string(x)) return { ...r, data: r.parser(x) }
            if (is<[Node | Node[] | string, unknown]>(is.array)(x)) {
              return {
                ...r,
                connection: { ...connect, ctx: x[1] } as Connection<any>,
                data: is.string(x[0]) ? r.parser(x[0]) : x[0]
              }
            }
            return { ...r, data: x }
          }),
          TE.chain(shear)
        )
      )
    )
  }
}

/**
 * Paginate on a url selector stop when it fails or reaches the iteration limit
 *
 * @category Selector
 * @since 0.0.1
 * @param url string or Selector passed to the @ref goTo function
 * @param limit number of times to attempt to paginate
 * @param follow selector executed on each iteration
 */
export const paginate: <A, T>(
  url: string | Shear<Node | Node[], Error, string>,
  limit: number,
  follow: Shear<Node | Node[], Error, A>,
  connection?: Connection<T>,
  results?: A[]
) => Shear<Node | Node[], Error, A[]> = (url, limit, follow, connection, results = []) =>
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
