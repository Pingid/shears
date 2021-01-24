import serialize from 'dom-serializer'
import { Node } from 'domhandler'

import { $, attr, text } from './selectors'
import { Shear, shear } from './shear'
import { is } from './utility'

export const qt: {
  <A>(query: string): Shear<Node | Node[], string>
  <A>(query: string, fn: (x: string) => A): Shear<Node | Node[], A>
} = (query: string, fn?: (x: string) => any) => shear($(query, fn ? text(fn) : text()), qt)

export const qa: (query: string, attribute: string) => Shear<Node | Node[], string> = (
  query: string,
  attribute: string
) => shear($(query, attr(attribute)), qa)

export const debug = <A, B>(shear: Shear<A, B>): Shear<A, B> => (r) => {
  if (r.data instanceof Node) throw serialize(r.data)
  if (is.array(r.data) && r.data[0] instanceof Node) throw serialize((r.data as any) as Node)
  return shear(r)
}
