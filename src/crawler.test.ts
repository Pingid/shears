import { isLeft } from 'fp-ts/lib/Either'
import * as TE from 'fp-ts/TaskEither'
import { parseDOM } from 'htmlparser2'

import { $, $$, text, html, attr, parent } from './selectors'
import { run, join, fork } from './shear'
import { goTo, connect } from './crawler'
import { createShear } from './helpers'

test('Example', async () => {
  const connection = connect(
    (url, _ctx) =>
      Promise.resolve({
        markup: page(url as '/' | '/one'),
        ctx: { hostname: url }
      }),
    { hostname: '/' }
  )

  const getText = (query: string) => createShear(join($(query), text()), getText)
  const result = await run(
    goTo(
      '/',
      fork({
        title: getText('title'),
        posts: join(
          $$(
            'li',
            fork({
              kool: join($('h4', parent($('h4', parent($('h4'))))), text()),
              title: getText('h4'),
              body: getText('p'),
              bod_html: join($('p'), html()),
              image: goTo(
                join($('a'), attr('href')),
                fork({
                  src: join($('img'), attr('src'))
                })
              )
            })
          )
        )
      })
    ),
    undefined,
    { connection }
  )()

  if (isLeft(result)) throw result.left
  console.log(result.right)
})

it('Should return DOM AST', async () => {
  const fn = jest.fn()
  const connection = connect(
    (url, ctx) => {
      if (fn) fn(url, ctx)
      return Promise.resolve({ markup: `<h1>hello</h1>`, ctx })
    },
    { hostname: 'http://helloworld.com' }
  )
  const result = await run(
    goTo('/', (r) => TE.of(r)),
    undefined,
    { connection }
  )()
  if (isLeft(result)) throw result.left
  expect(fn.mock.calls[0]).toEqual(['/', { hostname: 'http://helloworld.com' }])
  expect(result.right.data).toEqual(parseDOM(`<h1>hello</h1>`))
})

const page = (route: '/' | '/one' | '/two') =>
  ({
    ['/']: `
      <!DOCTYPE html>
      <html>
          <head><title>Shears Test HTML</title></head>
          <body>
              <h1>Shears</h1>
              <h3>Scraping made pretty</h3>
              <section id="posts">
                <h2>Recent updates</h2>
                <ul>
                  <li>
                    <h4>Update 1</h4>
                    <p>lorem ipsum</p>
                    <a href="/one">go to update 1</a>
                  </li>
                  <li>
                    <h4>Update 2</h4>
                    <p>lorem ipsum</p>
                    <a href="/two">go to update 1</a>
                  </li>
                </ul>
              </section>
          </body>
      </html>
  `,
    ['/one']: `
    <!DOCTYPE html>
    <html>
        <head><title>Post One</title></head>
        <body>
            <img src="one.jpeg" />
        </body>
    </html>
  `,
    ['/two']: `
    <!DOCTYPE html>
    <html>
        <head><title>Post Two</title></head>
        <body>
          <img src="two.jpeg" />
        </body>
    </html>
  `
  }[route])
