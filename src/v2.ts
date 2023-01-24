import { ReaderEither } from 'fp-ts/ReaderEither'
import { Node } from 'domhandler'
import * as cs from 'css-select'

type Typeof<R> = R extends ReaderEither<infer C, infer E, infer A> ? [C, E, A] : never
export type Select = {
  <E>(selector: string): ReaderEither<Node[] | Node, E, Node>
  <E>(selector: [string]): ReaderEither<Node[] | Node, E, Node[]>
  <T extends Record<string, ReaderEither<Node[] | Node, any, any>>>(selector: T): ReaderEither<
    Node[] | Node,
    Typeof<T[keyof T]>[1],
    { [K in keyof T]: Typeof<T[K]>[2] }
  >
}

export const select: Select = (selector: any) => (nodes: Node | Node[]) => {
  if (typeof selector === 'string') return cs.selectOne(selector, nodes)
  if (Array.isArray(selector)) return cs.selectAll(selector[0], nodes)

  return {} as any
}

const k = select({ one: select('one') })
