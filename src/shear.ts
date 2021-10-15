import ds, { DomSerializerOptions } from 'dom-serializer'
import { parseDocument } from 'htmlparser2'
import * as dh from 'domhandler'
import * as cs from 'css-select'
import * as du from 'domutils'

import { sequenceS, sequenceT } from 'fp-ts/lib/Apply'
import { flow, pipe } from 'fp-ts/lib/function'
import { fromNullable } from 'fp-ts/lib/Either'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'

import { is, CountArrayDepth, QueryError } from './utility'

// -------------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------------
export interface Node extends dh.Node {}

export interface Context<R> {
  readonly data: R
  readonly parser: typeof parseDocument
  readonly parallel: boolean
}

export interface Shear<R, E, A> extends RTE.ReaderTaskEither<Context<R>, E, A> {}

// -------------------------------------------------------------------------------------
// Core Api
// -------------------------------------------------------------------------------------
interface Select {
  /**
   * Select takes arguments
   *
   * @category Selector
   * @since 1.0.0
   */
  <E>(): Shear<Node[] | Node, E, Node[] | Node>

  // Query single
  (selector: string): Shear<Node[] | Node, Error, Node>
  (...args: [string | Shear<Node | Node[], Error, Node>, ...(Shear<Node, Error, Node> | string)[]]): Shear<
    Node[] | Node,
    Error,
    Node
  >
  <T>(
    ...args: [
      string | Shear<Node | Node[], Error, Node>,
      ...(Shear<Node, Error, Node> | string)[],
      Shear<Node, Error, T>
    ]
  ): Shear<Node[] | Node, Error, T>

  // Query many
  (selector: [string]): Shear<Node[] | Node, Error, Node[]>

  /**
   * Get the text content.
   *
   * @category Selector
   * @since 1.0.0
   */
  <S extends (string | [string])[]>(...args: S): Shear<Node[] | Node, Error, CountArrayDepth<S, Node>>
  <S extends (string | [string])[], T>(...args: [...S, Shear<Node, Error, T>]): Shear<
    Node[] | Node,
    Error,
    CountArrayDepth<S, T>
  >

  // Query struct
  <N extends Node[] | Node, T extends { [x: string | number]: Shear<N, Error, any> }>(struct: T): Shear<
    N,
    Error,
    { [K in keyof T]: T[K] extends Shear<any, Error, infer R> ? R : never }
  >
  <T extends { [x: string | number]: Shear<Node[] | Node, Error, any> }>(
    ...args: [string | Shear<Node[] | Node, Error, Node>, ...(string | Shear<Node, Error, Node>)[], T]
  ): Shear<Node[] | Node, Error, { [K in keyof T]: T[K] extends Shear<any, Error, infer R> ? R : never }>

  // Query tuple
  <T extends ReadonlyArray<Shear<Node[] | Node, Error, any>>>(arr: T): Shear<
    Node[] | Node,
    Error,
    { [K in keyof T]: [T[K]] extends [Shear<any, Error, infer R>] ? R : never }
  >
}
const select: Select = (...args: unknown[]) => {
  const failure = {
    error: new QueryError(``, select),
    stack: [] as string[]
  }

  const recursiveSelect =
    (failure: { error: Error; stack: string[] }, ...args: unknown[]): Shear<Node[] | Node, Error, any> =>
    (ctx) => {
      if (args.length === 0) return TE.right(ctx.data)

      const [head, ...tail] = args
      if (is.string(head)) {
        const fail = { ...failure, stack: [...failure.stack, head] }
        failure.error.message = `Missing: ${[...failure.stack].join(' > ')} > ( ${head} )`
        const selected = pipe(cs.selectOne(head, ctx.data), fromNullable(failure.error), TE.fromEither)
        return pipe(
          selected,
          TE.chain((data) => recursiveSelect(fail, ...(tail as any))({ ...ctx, data }))
        )
      }

      if (is.array(head)) {
        if (is.string(head[0])) {
          const selected = TE.right(cs.selectAll(head[0], ctx.data))
          const fail = { ...failure, stack: [...failure.stack, `[${head}]`] }
          return pipe(
            selected,
            TE.chain(flow(TE.traverseArray((data) => recursiveSelect(fail, ...(tail as any))({ ...ctx, data }))))
          )
        }
        if (ctx.parallel) return sequenceT(RTE.ApplicativePar)(...(head as [Shear<any, any, any>]))(ctx)
        return sequenceT(RTE.ApplicativeSeq)(...(head as [Shear<any, any, any>]))(ctx)
      }

      if (is<Shear<any, Error, any>>(is.function)(head)) {
        const selected = pipe(
          head(ctx),
          TE.mapLeft((error) => {
            error.message = `${failure.stack.join(' > ')} > ( ${error.message} )`
            return error
          })
        )
        const fail = { ...failure, stack: [...failure.stack, `shear(${head.name})`] }
        return pipe(
          selected,
          TE.chain((data) => recursiveSelect(fail, ...(tail as any))({ ...ctx, data }))
        )
      }

      if (is<{ [x: string]: Shear<any, Error, any> }>(is.shape)(head)) {
        if (ctx.parallel) return sequenceS(RTE.ApplicativePar)(head)(ctx)
        return sequenceS(RTE.ApplicativeSeq)(head)(ctx)
      }

      failure.error.message = `Incorrect argument type ${failure.stack.join(' > ')} ( <${typeof head}>:${head} )`
      throw failure.error
    }

  return recursiveSelect(failure, ...args)
}

export default select

/**
 * Run a shear
 *
 * @since 1.0.0
 * @param shear selector.
 */
export const run: <S extends Shear<Node | Node[], any, any>>(
  shear: S,
  markupOrContext?: string | Partial<Context<Node | Node[], any>>
) => TE.TaskEither<Error, S extends Shear<any, any, infer D> ? D : never> = (shear, markupOrContext) => {
  if (is.string(markupOrContext)) {
    return shear({ data: parseDocument(markupOrContext).children, parser: parseDocument, parallel: false })
  }
  return shear({
    ...markupOrContext,
    data: markupOrContext?.data || [],
    parser: markupOrContext?.parser || parseDocument,
    parallel: !!markupOrContext?.parallel
  })
}

/**
 * If a shear fails return null
 *
 * @category Utility
 * @since 1.0.0
 */
export const nullable: {
  <A, B>(a: Shear<A, Error, B>): Shear<A, Error, B | null>
} = flow(RTE.altW(() => RTE.right(null)))
select.nullable = nullable
interface Select {
  nullable: typeof nullable
}
// -------------------------------------------------------------------------------------
// Node Selectors
// -------------------------------------------------------------------------------------

/**
 * Get the text content.
 *
 * @category Selector
 * @since 1.0.0
 */
export const text: Shear<Node[] | Node, never, string> = (r) => TE.right(du.textContent(r.data))
select.text = text
interface Select {
  text: typeof text
}
/**
 * Get the serialised html.
 *
 * @category Selector
 * @since 1.0.0
 */
export const serialize: (options?: DomSerializerOptions) => Shear<Node[] | Node, Error, string> = (o) => (r) =>
  TE.right(ds(r.data as any, o))
select.serialize = serialize
interface Select {
  serialize: typeof serialize
}
/**
 * Get the serialised html.
 *
 * @category Selector
 * @since 1.0.0
 */
export const html = serialize()
select.html = html
interface Select {
  html: typeof html
}
/**
 * Select all the attributes on an element
 *
 * @category Selector
 * @since 1.0.0
 */
export const attributes: Shear<Node, Error, { [x: string]: string }> = (r: Context<Node>) => {
  const error = new QueryError(`Node is not an element type`, attributes)
  return r.data instanceof dh.Element ? TE.right(r.data.attribs) : TE.left<QueryError, never>(error)
}
select.attributes = attributes
interface Select {
  attributes: typeof attributes
}
/**
 * Select a particular attribute from a Node.
 *
 * @category Selector
 * @since 1.0.0
 */
export const atr: (prop: string) => Shear<Node, Error, string> = (prop) => {
  const error = new QueryError(`Node doesn't have attribute (${prop})`, atr)
  return pipe(
    attributes,
    RTE.chain((y) => (is.undefined(y[prop]) ? RTE.left(error) : RTE.right(y[prop])))
  )
}
select.atr = atr
interface Select {
  atr: typeof atr
}
// -------------------------------------------------------------------------------------
// Traversal
// -------------------------------------------------------------------------------------

/**
 * Get node parent.
 *
 * @category Selector
 * @since 1.0.0
 */
export const parent: (nth?: number) => Shear<Node, Error, Node> = (nth = 1) => {
  const error = new QueryError(`Node has no ${nth > 1 ? `${nth} ` : ''}parent`, parent)
  return (r) => pipe(du.getParent(r.data), fromNullable(error), TE.fromEither)
}
select.parent = parent
interface Select {
  parent: typeof parent
}
