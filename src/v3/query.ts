import { Node } from 'domhandler'
import { flow } from '@effect-ts/core/Function'
import * as A from '@effect-ts/core/Collections/Immutable/Array'
import * as C from '@effect-ts/core/Collections/Immutable/Chunk'
import * as E from '@effect-ts/core/Effect'
import * as cs from 'css-select'

import { CountArrayDepth, ShearError, Shear } from '../utility'
import { pipe } from 'fp-ts/lib/function'

type Typeof<R> = R extends Shear<infer C, infer A> ? [C, ShearError, A] : never
type Values = Shear<Node[] | Node, any> | string | [string]
type TypeofValue<T extends Values> = Values extends string ? Node : Values extends [string] ? Node[] : Typeof<T>[2]

export type Query = {
  (): Shear<Node[] | Node, Node[] | Node>
  (selector: string): Shear<Node[] | Node, Node>
  <E>(selector: [string]): Shear<Node[] | Node, Node[]>
  <T extends Record<string, Values>>(selector: T): Shear<Node[] | Node, { [K in keyof T]: TypeofValue<T[K]> }>
  <T extends ReadonlyArray<string | [string] | Shear<Node, Node>>>(...args: T): Shear<
    Node[] | Node,
    CountArrayDepth<T, Node>
  >
  <T extends ReadonlyArray<string | [string] | Shear<Node, Node>>, R>(...args: [...T, Shear<Node[] | Node, R>]): Shear<
    Node[] | Node,
    CountArrayDepth<T, R>
  >
}

export const query: Query = (...selectors: (string | [string] | Shear<Node, Node> | Record<string, Values>)[]) =>
  pipe(
    E.environment<Node | Node[]>(`( ${query} )`),
    E.chain((a) => {
      let next: E.Effect<any, any, Node | Node[]> = E.succeed(a)
      for (let i in selectors) {
        const value = selectors[i]
        if (typeof value === 'string') {
          next = pipe(
            next,
            E.chain((x) => pipe(selectFirst(value), E.provide(x)))
          )
        }
      }
      return next
    })
  ) as any

// {

// }
// pipe(
//   selectors
//   // E.ch()
//   // E.forEach(x => E.succeed(x)),
//   // E.map(C.toArray),
//   // E.map(y => y.)
// ) as any

// // ?

// const k = pipe(
//   query('one'),
//   E.chain((y) => query('two'))
// )

const selectFirst = (query: string) =>
  pipe(
    E.environment<Node | Node[]>(`( ${query} )`),
    E.chain((a) => {
      const result = cs.selectOne(query, a)
      if (result instanceof Node) return E.succeed(result)
      const error = new ShearError(`Missing ( ${query} )`, selectFirst)
      return E.fail(error)
    })
  )
