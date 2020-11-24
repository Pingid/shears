import { Node, Element } from 'domhandler'
import serialize from 'dom-serializer'
import * as cs from 'css-select'
import * as du from 'domutils'

import { pipe } from 'fp-ts/lib/function'
import * as TE from 'fp-ts/TaskEither'

import type { Context, Parsed, Shear } from './types'

/**
 * Finds the first node to match a CSS query string.
 *
 * @category Selector
 * @since 1.0.0
 * @param query CSS selector string.
 */
export const $ = <N>(query: string): Shear<Parsed, Node, N> => <T>(
  r: Context<Parsed, T>
): TE.TaskEither<string, Node> =>
  pipe(cs.selectOne(query, r.data), (y) => (y ? TE.right(y) : TE.left(`Cant find node matching query ${query}`)))

/**
 * Finds all nodes matching a CSS query string.
 *
 * @category Selector
 * @since 1.0.0
 * @param query CSS selector string.
 */
export const $$ = <N>(cssSelector: string) => (r: Context<Parsed, N>): TE.TaskEither<string, Node[]> =>
  TE.right(cs.selectAll(cssSelector, r.data))

/**
 * Get the parent node
 *
 * @category Selector
 * @since 1.0.0
 */
export const parent = <T>(r: Context<Node, T>): TE.TaskEither<string, Node> =>
  pipe(du.getParent(r.data), (x) => (x === null ? TE.left('Node has no parent') : TE.right(x)))

/**
 * Get the siblings of the node including the current node.
 *
 * @category Selector
 * @since 1.0.0
 */
export const siblings = <T>(r: Context<Node, T>): TE.TaskEither<string, Node[]> =>
  pipe(du.getSiblings(r.data), (x) => (x === null ? TE.left('Node has no parent') : TE.right(x)))

/**
 * Get the next sibling lying adjecent or bellow the current node
 *
 * @category Selector
 * @since 1.0.0
 */
export const nextSibling = <T>(r: Context<Node, T>): TE.TaskEither<string, Node> =>
  pipe(du.nextElementSibling(r.data), (x) => (x === null ? TE.left('Node has no parent') : TE.right(x)))

/**
 * Get the text content of the node, and its children if it has any.
 *
 * @category Selector
 * @since 1.0.0
 */
export const text = <T>(r: Context<Parsed, T>): TE.TaskEither<string, string> => TE.right(du.getText(r.data))

/**
 * Get the serialised html.
 *
 * @category Selector
 * @since 1.0.0
 */
export const html = <T>(r: Context<Parsed, T>): TE.TaskEither<string, string> => TE.right(serialize(r.data))

/**
 * Get any attributes from a Node.
 *
 * @category Selector
 * @since 1.0.0
 */
export const attributes = <T>(r: Context<Node, T>): TE.TaskEither<string, { [x: string]: string }> =>
  r.data instanceof Element ? TE.right(r.data.attribs) : TE.left(`No attributes exist node type ${r.data.nodeType}`)

/**
 * Select a particular attribute from a Node.
 *
 * @category Selector
 * @since 1.0.0
 */
export const attr = (prop: string) => <T>(r: Context<Node, T>) =>
  pipe(
    attributes(r),
    TE.chain((x) =>
      x[prop]
        ? TE.right(x[prop])
        : TE.left(`Attribute ${prop} doesn't exist in attributes ${JSON.stringify(x, null, 2)}`)
    )
  )

// /**
//  * Finds all nodes matching a predicate accepting a Node.
//  *
//  * @category Selector
//  * @since 1.0.0
//  * @param fn predicate function that accepts a Node
//  * @param recurse also consider child nodes defaults to true.
//  * @param limit maximum number of nodes to return defaults to 9999.
//  */
// export const find = (fn: Predicate<Node>, recurse: boolean = true, limit: number = 9999): Shear<Parsed, Node[]> =>
//   context(
//     chain((c) => pipe(du.filter(fn, c.data, recurse, limit), (x) => (x === null ? left(`Didn't find node`) : right(x))))
//   )

// /**
//  * Finds all nodes matching a predicate accepting the inner text of a Node.
//  *
//  * @category Selector
//  * @since 1.0.0
//  * @param fn predicate function that accepts a Node
//  * @param recurse also consider child nodes defaults to true.
//  * @param limit maximum number of nodes to return defaults to 9999.
//  */
// export const findByText = (text: string | RegExp, recurse: boolean = true, limit: number = 9999) =>
//   find(
//     (x) => (du.isText(x) ? (is.string(text) ? text === x.nodeValue : new RegExp(text).test(x.nodeValue)) : false),
//     recurse,
//     limit
//   )

// /**
//  * Get node at soome index from a list of nodes
//  *
//  * @category Selector
//  * @since 1.0.0
//  * @param n index of the node to return
//  */
// export const nth = (n: number): Shear<Node[], Node> =>
//   context(
//     chain((c) =>
//       c.data[n] === undefined
//         ? left(`N: ${n} is greater the then length ${c.data.length} of the list of nodes`)
//         : right(c.data[n])
//     )
//   )
