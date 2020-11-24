import { Node, Element } from "domhandler";
import serialize from "dom-serializer";
import { parseDOM } from "htmlparser2";
import * as cs from "css-select";
import * as du from "domutils";

import { sequenceS, sequenceT } from "fp-ts/Apply";
import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import * as A from "fp-ts/Array";

export type Error = string;
export type Parsed = Node | Node[];

export type Get<A> = (
  input: string,
  next: A
) => TE.TaskEither<Error, { data: Parsed; next: A }>;
export type Context<R, A> = { get: Get<A>; next: A; data: R };

export type Shear<R, A, N> = RTE.ReaderTaskEither<Context<R, N>, Error, A>;

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
  pipe(cs.selectOne(query, r.data), (y) =>
    y ? TE.right(y) : TE.left(`Cant find node matching query ${query}`)
  );

/**
 * Finds all nodes matching a CSS query string.
 *
 * @category Selector
 * @since 1.0.0
 * @param query CSS selector string.
 */
export const $$ = <N>(cssSelector: string) => (
  r: Context<Parsed, N>
): TE.TaskEither<string, Node[]> => TE.right(cs.selectAll(cssSelector, r.data));

/**
 * Get the parent node
 *
 * @category Selector
 * @since 1.0.0
 */
export const parent = <T>(r: Context<Node, T>): TE.TaskEither<string, Node> =>
  pipe(du.getParent(r.data), (x) =>
    x === null ? TE.left("Node has no parent") : TE.right(x)
  );

/**
 * Get the siblings of the node including the current node.
 *
 * @category Selector
 * @since 1.0.0
 */
export const siblings = <T>(
  r: Context<Node, T>
): TE.TaskEither<string, Node[]> =>
  pipe(du.getSiblings(r.data), (x) =>
    x === null ? TE.left("Node has no parent") : TE.right(x)
  );

/**
 * Get the next sibling lying adjecent or bellow the current node
 *
 * @category Selector
 * @since 1.0.0
 */
export const nextSibling = <T>(
  r: Context<Node, T>
): TE.TaskEither<string, Node> =>
  pipe(du.nextElementSibling(r.data), (x) =>
    x === null ? TE.left("Node has no parent") : TE.right(x)
  );

/**
 * Get the text content of the node, and its children if it has any.
 *
 * @category Selector
 * @since 1.0.0
 */
export const text = <T>(r: Context<Parsed, T>): TE.TaskEither<string, string> =>
  TE.right(du.getText(r.data));

/**
 * Get the serialised html.
 *
 * @category Selector
 * @since 1.0.0
 */
export const html = <T>(r: Context<Parsed, T>): TE.TaskEither<string, string> =>
  TE.right(serialize(r.data));

/**
 * Get any attributes from a Node.
 *
 * @category Selector
 * @since 1.0.0
 */
export const attributes = <T>(
  r: Context<Node, T>
): TE.TaskEither<string, { [x: string]: string }> =>
  r.data instanceof Element
    ? TE.right(r.data.attribs)
    : TE.left(`No attributes exist node type ${r.data.nodeType}`);

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
        : TE.left(
            `Attribute ${prop} doesn't exist in attributes ${JSON.stringify(
              x,
              null,
              2
            )}`
          )
    )
  );

/**
 * Join shears in series
 *
 * @example
 *
 * const innerText = join($('h1'), text);
 *
 * @category Selector
 * @since 1.0.0
 * @params shears
 */
export const join: Join = (...[head, ...tail]: any[]) =>
  !head
    ? RTE.readerTaskEither.map(RTE.ask<Context<any, any>>(), (x) => x.data)
    : RTE.readerTaskEither.chain(head, (x) => (y: any) =>
        join(...(tail as [Shear<any, any, any>]))({ ...y, data: x })
      );

type Join = {
  (): Shear<any, any, unknown>;
  <R, A, N>(a: Shear<R, A, N>): Shear<R, A, N>;
  <R, A, B, N>(a: Shear<R, A, N>, b: Shear<A, B, N>): Shear<R, B, N>;
  <R, A, B, C, N>(
    a: Shear<R, A, N>,
    b: Shear<A, B, N>,
    c: Shear<B, C, N>
  ): Shear<R, C, N>;
  <R, A, B, C, D, N>(
    a: Shear<R, A, N>,
    b: Shear<A, B, N>,
    c: Shear<B, C, N>,
    d: Shear<C, D, N>
  ): Shear<R, D, N>;
  <R, A, B, C, D, E, N>(
    a: Shear<R, A, N>,
    b: Shear<A, B, N>,
    c: Shear<B, C, N>,
    d: Shear<C, D, N>,
    e: Shear<D, E, N>
  ): Shear<E, R, N>;
  <R, A, B, C, D, E, F, N>(
    a: Shear<R, A, N>,
    b: Shear<A, B, N>,
    c: Shear<B, C, N>,
    d: Shear<C, D, N>,
    e: Shear<D, E, N>,
    f: Shear<E, F, N>
  ): Shear<R, F, N>;
  <R, A, B, C, D, E, F, G, N>(
    a: Shear<R, A, N>,
    b: Shear<A, B, N>,
    c: Shear<B, C, N>,
    d: Shear<C, D, N>,
    e: Shear<D, E, N>,
    f: Shear<E, F, N>,
    g: Shear<F, G, N>
  ): Shear<R, G, N>;
};

/**
 * Resolves a structured shear.
 *
 * @example
 *
 * const contents = fork({ title: query('h1') })
 *
 * @category Selector
 * @since 1.0.0
 */
export const fork = <T extends Forked, N>(
  fork: T
): Shear<Parsed, ForkResult<T>, N> => {
  if (is<Shear<any, any, N>>(is.function)(fork)) return fork;
  if (is<Shear<any, any, N>[]>(is.array)(fork))
    return sequenceT(RTE.readerTaskEither)(...(fork as any)) as any;
  if (is<{ [x: string]: Forked<any> }>(is.object)(fork))
    return sequenceS(RTE.readerTaskEither)(fork as any) as any;
  throw new Error(`Select does not accept a selector of ${typeof fork}`);
};

type Forked<T = any, R = any, N = any> =
  | Shear<T, R, N>
  | Shear<T, R, N>[]
  | { [x: string]: Shear<T, R, N> };
type ForkResult<T extends Forked> = T extends Shear<any, infer D, any>
  ? D
  : T extends Shear<any, any, any>[]
  ? {
      [I in keyof T]: ForkResult<Extract<T[I], T[number]>>; // Extract is needed here
    }
  : T extends { [x: string]: Shear<any, any, any> }
  ? { [Key in keyof T]: ForkResult<T[Key]> }
  : never;

/**
 * Paginate the same selector
 *
 * @category Selector
 * @since 1.0.0
 * @param a shear.
 * @param b fallback shear or value
 */
export const each = <R extends any[], A, N>(
  shear: Shear<R, A, N>
): Shear<R, A[], N> =>
  pipe(
    RTE.ask<Context<R, N>>(),
    RTE.chain((x) =>
      A.array.traverse(RTE.readerTaskEither)(x.data, (y) => (z) =>
        shear({ ...z, data: y })
      )
    )
  );

/**
 * Paginate the same selector
 *
 * @category Selector
 * @since 1.0.0
 * @param a shear.
 * @param b fallback shear or value
 */
export const getOrElse = <A, B, C, N>(
  a: Shear<A, B, N>,
  b: C | Shear<A, C, N>
) =>
  RTE.readerTaskEither.alt<Context<A, N>, string, B | C>(a, () =>
    is<Shear<A, C, N>>(is.function)(b) ? b : RTE.of(b)
  );

/**
 * Run a shear
 *
 * @since 1.0.0
 * @param fetch connect to network
 * @param shear selector.
 */
export const run = <C, A>(
  fetch: (
    url: string,
    last: C
  ) => TE.TaskEither<string, { html: string; next: C }>,
  next: C,
  shear: Shear<Parsed, A, C>,
  parser?: typeof parseDOM
) =>
  shear({
    get: (url, last) =>
      pipe(
        fetch(url, last),
        TE.map((x) => ({ data: (parser || parseDOM)(x.html), next: x.next }))
      ),
    data: [],
    next,
  });

/**
 * Go to a URL and return HTML AST.
 *
 * @since 1.0.0
 * @param url Shear<string> or string url.
 */
export const goTo = <R, A, C>(
  url: string | Shear<R, string, C>,
  shear: Shear<Parsed, A, C>
): Shear<R, A, C> => (r) =>
  pipe(
    is.function(url) && r ? url(r) : TE.of(url as string),
    TE.chain((y) => (!r.get ? TE.left("") : r.get(y, r?.next))),
    TE.chain((y) => shear({ ...r, ...y }))
  );

/**
 * Paginate on a url selector stop when it fails or reaches the iteration limit
 *
 * @category Selector
 * @since 1.0.0
 * @param url string or Selector passed to the @ref goTo function
 * @param limit number of times to attempt to paginate
 * @param follow selector executed on each iteration
 */
export const paginate = <T, N>(
  url: string | Shear<Parsed, string, N>,
  limit: number,
  follow: Shear<Parsed, T, N>,
  results: T[] = []
): Shear<Parsed, T[], N> =>
  pipe(
    RTE.ask<Context<Parsed, N>>(),
    RTE.chain((y) =>
      pipe(
        follow(y),
        TE.chain((x) => {
          if (limit <= 0) return TE.right([...results, x]);
          return TE.taskEither.alt(
            goTo(url, paginate(url, limit - 1, follow, [...results, x]))(y),
            () => TE.right([...results, x])
          );
        }),
        (x) => RTE.fromTaskEither(x)
      )
    )
  );

// -------------------------------------------------------------------------------------
// Type guard utility
// -------------------------------------------------------------------------------------
export const is = <T extends any>(fn: (x: unknown) => boolean) => (
  x: unknown
): x is T => fn(x);
is.object = is<Record<any, any>>(
  (x) => typeof x === "object" && !Array.isArray(x) && x !== null
);
is.function = is<Function>((x) => typeof x === "function");
is.string = is<string>((x) => typeof x === "string");
is.array = is<any[]>((x) => Array.isArray(x));

export * from "./selectors";
export * from "./utility";
export * from "./crawl";
export * from "./types";
