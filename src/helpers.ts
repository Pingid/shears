import serialize from 'dom-serializer'
import { Node } from 'domhandler'

import { $, attr, join, text } from './selectors'
import { Shear, shear } from './shear'
import { is } from './utility'

export const qt = (query: string) => shear(join($(query), text), qt)
export const qa = (query: string, attribute: string) => shear(join($(query), attr(attribute)), qa)

export const debug = <A, B>(shear: Shear<A, B>): Shear<A, B> => (r) => {
  if (r.data instanceof Node) throw serialize(r.data)
  if (is.array(r.data) && r.data[0] instanceof Node) throw serialize(r.data)
  return shear(r)
}
