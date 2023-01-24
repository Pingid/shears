import type { Node } from 'domhandler'

import { CountArrayDepth, Shear } from '../utility'

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
