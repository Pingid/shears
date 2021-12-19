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

import { is, CountArrayDepth, ShearError, Last } from './utility'

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
export type TypeOfShearReturn<T> = T extends Shear<any, any, infer D> ? D : never

// -------------------------------------------------------------------------------------
// Core Api
// -------------------------------------------------------------------------------------
interface Select {
  /**
   * Create structured css selectors
   *
   * @example
   * import * as sh from 'shears';
   *
   * sh('body > #content > ul', ['li'], sh({ title: sh('h1', sh.text) })) // [{ title: string },{...]
   *
   * @category selector
   * @since 0.0.1
   */
  <E>(): Shear<Node[] | Node, E, Node[] | Node>
  <
    S extends [
      string | [string] | Shear<Node | Node[], Error, Node>,
      ...(string | [string] | Shear<Node, Error, Node>)[]
    ]
  >(
    ...args: S
  ): Shear<Node[] | Node, Error, CountArrayDepth<S, Node>>
  <
    S extends [
      string | [string] | Shear<Node | Node[], Error, Node>,
      ...(string | [string] | Shear<Node, Error, Node>)[],
      Shear<Node, Error, any>
    ]
  >(
    ...args: S
  ): Shear<Node[] | Node, Error, CountArrayDepth<S, TypeOfShearReturn<Last<S>>>>

  <N extends Node[] | Node, T extends { [x: string | number]: Shear<N, Error, any> }>(struct: T): Shear<
    N,
    Error,
    { [K in keyof T]: T[K] extends Shear<any, Error, infer R> ? R : never }
  >
  <T extends { [x: string | number]: Shear<Node[] | Node, Error, any> }>(
    ...args: [string | Shear<Node[] | Node, Error, Node>, ...(string | Shear<Node, Error, Node>)[], T]
  ): Shear<Node[] | Node, Error, { [K in keyof T]: T[K] extends Shear<any, Error, infer R> ? R : never }>

  <T extends ReadonlyArray<Shear<Node[] | Node, Error, any>>>(arr: T): Shear<
    Node[] | Node,
    Error,
    { [K in keyof T]: [T[K]] extends [Shear<any, Error, infer R>] ? R : never }
  >
}
export const select: Select = (...args: unknown[]) => {
  const failure = {
    error: new ShearError(``, select),
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

  return recursiveSelect(failure, ...args) as any
}

/**
 * Resolve a shear to a TaskEither
 *
 * @example
 * import * as sh from 'shears'
 *
 * sh.run(sh('title', sh.text), <html ...) // TaskEither<Error, string>
 *
 * @param shear selector.
 *
 * @category utility
 * @since 0.0.1
 */
export const run: <S extends Shear<Node | Node[], any, any>>(
  shear: S,
  markupOrContext?: string | Partial<Context<Node | Node[], any>>
) => TE.TaskEither<Error, TypeOfShearReturn<S>> = (shear, markupOrContext) => {
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
 * Resolve a shear to a Promise
 *
 * @example
 * import * as sh from 'shears'
 *
 * sh.runP(sh('title', sh.text), <html ...) // Promise<string>
 *
 * @param shear selector.
 * @param markupOrContext html string or Shear context object.
 *
 * @category utility
 * @since 0.0.1
 */
export const runP: <S extends Shear<Node | Node[], any, any>>(
  shear: S,
  markupOrContext?: string | Partial<Context<Node | Node[], any>>
) => Promise<TypeOfShearReturn<S>> = (shear, markupOrContext) =>
  pipe(
    run(shear, markupOrContext),
    TE.getOrElse((error) => () => Promise.reject(error))
  )()

/**
 * Create a shear that returns null instead of failing
 *
 * @example
 * import * as sh from 'shears'
 *
 * sh({ title: sh.nullable(sh('title', sh.text)) }) // { title: string | null }
 *
 * @category utility
 * @since 0.0.1
 */
export const nullable: {
  <A, B>(a: Shear<A, Error, B>): Shear<A, Error, B | null>
} = flow(RTE.altW(() => RTE.right(null)))

// -------------------------------------------------------------------------------------
// Node Selectors
// -------------------------------------------------------------------------------------

/**
 * Get the inner text content.
 *
 * @category selector
 * @since 0.0.1
 */
export const text: Shear<Node[] | Node, never, string> = (r) => TE.right(du.textContent(r.data))

/**
 * Get the serialised html.
 *
 * @param {DomSerializerOptions}
 *
 * @category selector
 * @since 0.0.1
 */
export const serialize: (options?: DomSerializerOptions) => Shear<Node[] | Node, Error, string> = (o) => (r) =>
  TE.right(ds(r.data as any, o))

/**
 * See {@link serialize} with default serializer options.
 *
 * @category selector
 * @since 0.0.1
 */
export const html = serialize()

/**
 * Get all the attributes on an element
 *
 * @category selector
 * @since 0.0.1
 */
export const attributes: Shear<Node, Error, { [x: string]: string }> = (r: Context<Node>) => {
  const error = new ShearError(`Node is not an element type`, attributes)
  return r.data instanceof dh.Element ? TE.right(r.data.attribs) : TE.left<ShearError, never>(error)
}

/**
 * Select a particular attribute from an Element
 *
 * @category selector
 * @since 0.0.1
 */
export const atr: (prop: string) => Shear<Node, Error, string> = (prop) => {
  const error = new ShearError(`Node doesn't have attribute (${prop})`, atr)
  return pipe(
    attributes,
    RTE.chain((y) => (is.undefined(y[prop]) ? RTE.left(error) : RTE.right(y[prop])))
  )
}

// -------------------------------------------------------------------------------------
// Traversal
// -------------------------------------------------------------------------------------

/**
 * Get parent node.
 *
 * @param {number} nth number of parent
 *
 * @category Traversal
 * @since 0.0.1
 */
export const parent: Shear<Node, Error, Node> = (r) =>
  pipe(du.getParent(r.data), fromNullable(new ShearError(`Node has no parent`, parent)), TE.fromEither)
