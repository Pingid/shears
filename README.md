# Shears

A Declarative web scraping library that aims to provide an extendable set of tools for building complex typesafe queries and web crawlers.

```typescript
import * as sh from 'shears'

const article = sh.select({
    title: sh.select('h1', sh.text),
    content: sh.select('h1', sh.text)
    image: sh.select('img', sh.atr('src'))
})

const article_list = sh.select('#content', ['ul > li'], article)

await sh.runP(article_list, '<html><...')
// [{ title: '...' content: '...' },{...]
```

The library works best when used in combination with [fp-ts](https://github.com/gcanti/fp-ts) however the runP returns a `Promise` instead of `TaskEither` returned by the `run` function, this allows for standalone use but still requires fp-ts as a peer dependency.

## Usage

### Selectors

The `select` function is the main building block and accepts any number of arguments of type `string`, `[string]`, `Shear<Node, Node>` where the final argument can be of type `Shear<Node, T>`.

```typescript
sh.select('body > h1') // Shear<Node | Node[], Node<h1>>
sh.select('body > h1', 'span') // Shear<Node | Node[], Node<span>>
sh.select('body > ul', ['li']) // Shear<Node | Node[], Node<li>[]>
sh.select(['body > ul'], sh.text) // Shear<Node | Node[], string[]>
sh.select(['body > ul'], ['li'], sh.text) // Shear<Node | Node[], string[][]>
sh.select({ foo: sh.text }) // Shear<Node | Node[], { foo: string }>
sh.select([sh.text, sh.text]) // Shear<Node | Node[], [string, string]>
```

- `string`: Accepts a css query and returns the first matching DOM node, like `document.querySelector`.
- `[string]`: Accepts a css query and returns all matching DOM nodes like `document.querySelectorAll`.

Each query in the list of arguments operates on the part of the DOM returned by the previous query where parameters after `[string]` queries operate on each item in the return list.

### customizing Shears

A "Shear" extends the [ReaderTaskEither](https://gcanti.github.io/fp-ts/modules/ReaderTaskEither.ts.html) type class so you can easily build your selectors.

```typescript
import { map } from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'

import sh, { run } from 'shears'

const trimText = pipe(
  sh.text,
  map((y) => y.trim())
)

run(sh('body > h1', trimText), `<h1> foo </h1>`) // TaskEither<never, 'foo'>
```

### Crawling

The library provides a few shears to help with queries across multiple pages.

```typescript
import { map } from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import axios from 'axios'

import * as sh from 'shears'

const connection = sh.connect((url) => axios.get(url).then((x) => x.data))

sh.run(
  sh.select({
    posts: sh.select(
      '[#post]',
      sh.goTo(
        sh.select('a', sh.atr('href')),
        sh.select({
          title: sh.select('h1', sh.text)
        }),
        { connection }
      )
    )
  })
)
```

Often it is the case you want to follow relative links on a website where our connection would need to know the current hostname. The "Shear" provides a mechanism for passing context we just need to change the connection implementation.

```typescript
const connection = sh.connect(
  (url, ctx) =>
    (/^http/.test(url) ? axios.get(url) : axios.get(ctx.hostname + url)).then((x) => [
      x.data,
      { hostname: x.response.hostname }
    ]), // We return a tuple [{  html string  },  { new context }]
  { hostname: '' } // Initial context state
)
```

We can pass our connection into the run function which provides it in the shear context so we don't need to pass it to `goTo`.

```typescript
sh.run(
  sh.goTo(
    'http://foo.bar',
    sh.select({
      posts: sh(
        '[#post]',
        sh.goTo(
          sh.select('a', sh.atr('href')),
          sh.select({
            title: sh.select('h1', sh.text)
          })
        )
      )
    })
  ),
  { connection }
)
```
