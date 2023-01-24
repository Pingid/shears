// import * as Array from "@effect-ts/cor";
import * as Array from '@effect-ts/core/Collections/Immutable/Array'
import * as Chunk from '@effect-ts/core/Collections/Immutable/Chunk'
import { pipe, flow } from '@effect-ts/core/Function'
import * as E from '@effect-ts/core/Effect'
import { Node } from 'domhandler'
import * as cs from 'css-select'
import * as du from 'domutils'

import { CountArrayDepth, ShearError } from '../utility'

export * from './attr'
export * from './query'
export * from './text'

type Shear<R, A> = E.Effect<R, ShearError, A>

type Typeof<R> = R extends Shear<infer C, infer A> ? [C, ShearError, A] : never
type Values = Shear<Node[] | Node, any> | string | [string]
type TypeofValue<T extends Values> = Values extends string ? Node : Values extends [string] ? Node[] : Typeof<T>[2]

// const foreachArray = Array.Traversable.foreachF(E.Applicative);

export type Select = {
  (selector: string): Shear<Node[] | Node, Node>
  <E>(selector: [string]): Shear<Node[] | Node, Node[]>
  <T extends Record<string, Values>>(selector: T): Shear<Node[] | Node, { [K in keyof T]: TypeofValue<T[K]> }>
  <T extends ReadonlyArray<string | [string]>>(...args: T): Shear<Node[] | Node, CountArrayDepth<T, Node>>
}

export const select: Select = (...selector: any) => {
  // if (typeof selector === 'string') return selectFirst(selector)
  // if (Array.isArray(selector)) return selectAll(selector[0])
  return {} as any
}

export type Text = {
  (): Shear<Node[] | Node, string>
  (selector: string): Shear<Node[] | Node, string>
  <E>(selector: [string]): Shear<Node[] | Node, string[]>
  <T extends Record<string, string>>(selector: T): Shear<Node[] | Node, { [K in keyof T]: string }>
  <T extends ReadonlyArray<string | [string]>>(...args: T): Shear<Node[] | Node, CountArrayDepth<T, string>>
}

export const text: Text = (...selector: any) => {
  // if (typeof selector === 'string') return selectFirst(selector)
  // if (Array.isArray(selector)) return selectAll(selector[0])
  return {} as any
}

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

// const text = E.map(du.textContent)
const k = select({
  one: text()
})

const foreach: <R, A>(shear: Shear<R, A>) => <R, E>(val: E.Effect<R, E, Iterable<R>>) => Shear<R, Array.Array<A>> = (
  shear
) => flow(E.chain(E.forEachPar((x) => pipe(shear, E.provide(x)))), E.map(Chunk.toArray)) as any

// const s = pipe(select('123'), text)
// const k1 = pipe(select('one', ['two']), foreach(pipe(select('one'), text)))

// const k2 = select({ one: pipe(select('123'), text), two: select(['123']) })
