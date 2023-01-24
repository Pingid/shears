import type { Node } from 'domhandler'

import { CountArrayDepth, Shear } from '../utility'

export type Attr = {
  (attribute: string): Shear<Node[] | Node, string>
  (attribute: string, selector: string): Shear<Node[] | Node, string>
  <E>(attribute: string, selector: [string]): Shear<Node[] | Node, string[]>
  <T extends Record<string, string>>(attribute: string, selector: T): Shear<Node[] | Node, { [K in keyof T]: string }>
  <T extends ReadonlyArray<string | [string]>>(...args: [string, ...T]): Shear<
    Node[] | Node,
    CountArrayDepth<T, string>
  >
}

export const attr: Attr = (...selector: any) => {
  // if (typeof selector === 'string') return selectFirst(selector)
  // if (Array.isArray(selector)) return selectAll(selector[0])
  return {} as any
}
