import * as du from 'domutils'

import { isLeft, isRight } from 'fp-ts/lib/Either'
import { map } from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/lib/function'
import * as TE from 'fp-ts/TaskEither'

import { connect, goTo } from './connect'
import * as sh from './index'

describe('select', () => {
  it('should handle single string css selecter', async () => {
    const result = await sh.run(sh.select('h1'), '<div>one<h1>two</h1>three</div>')()
    if (isLeft(result)) throw result.left
    expect(du.textContent(result.right)).toBe('two')
  })

  it('should handle chaining string selectors', async () => {
    const result = await sh.run(
      sh.select('ul', sh.select('li:nth-child(2)'), sh.select('h1')),
      '<ul><li>one<h1>two</h1>three</li><li>three<h1>four</h1>five</li></ul>'
    )()
    if (isLeft(result)) throw result.left
    expect(du.textContent(result.right)).toBe('four')
  })

  it('should handle querying multiple elements', async () => {
    const result = await sh.run(
      sh.select(['li']),
      '<ul><li>one<h1>two</h1>three</li><li>three<h1>four</h1>five</li></ul>'
    )()
    if (isLeft(result)) throw result.left
    expect(result.right.length).toBe(2)
  })

  it('should handle nested multy queries', async () => {
    const result = await sh.run(
      sh.select(['ul'], ['li']),
      '<ul><li>1</li><li>2</li></ul><ul><li>3</li><li>4</li></ul>'
    )()
    if (isLeft(result)) throw result.left
    expect(result.right.map((y) => y.map(du.textContent))).toEqual([
      ['1', '2'],
      ['3', '4']
    ])
  })

  it('should handle tuple shears', async () => {
    const result = await sh.run(
      sh.select([sh.select('li:nth-child(1)'), sh.select('li:nth-child(2)')] as const),
      '<ul><li>1</li><li>2</li></ul><ul><li>3</li><li>4</li></ul>'
    )()
    if (isLeft(result)) throw result.left
    expect(result.right.map(du.textContent)).toEqual(['1', '2'])
  })

  it('should handle struct shears', async () => {
    const result = await sh.run(
      sh.select({ one: sh.select('li:nth-child(1)'), two: sh.select('li:nth-child(2)') }),
      '<ul><li>1</li><li>2</li></ul><ul><li>3</li><li>4</li></ul>'
    )()
    if (isLeft(result)) throw result.left
    expect(du.textContent(result.right.one)).toEqual('1')
    expect(du.textContent(result.right.two)).toEqual('2')
  })

  it('should handle chaining queries', async () => {
    const result = await sh.run(
      pipe(sh.select('h1'), sh.chain(sh.parent), sh.chain(sh.text)),
      '<div>one<h1>two</h1>three</div>'
    )()
    if (isLeft(result)) throw result.left
    expect(result.right).toEqual('onetwothree')
  })

  describe('Errors', () => {
    it('should show single queries in stack', async () => {
      const result = await sh.run(sh.select('div', 'h1', 'h4'), '<div>one<h1>two</h1>three</div>')()
      if (isRight(result)) throw result
      expect(result.left.message.split('\n')[0].trim()).toBe('Missing: div > h1 > ( h4 )')
    })
    it('should show multi queries in stack', async () => {
      const result = await sh.run(sh.select(['div'], ['h1'], 'h4'), '<div>one<h1>two</h1>three</div>')()
      if (isRight(result)) throw result
      expect(result.left.message.split('\n')[0].trim()).toBe('Missing: [div] > [h1] > ( h4 )')
    })
  })
})

describe('selecters', () => {
  it('should return sibling nodes', async () => {
    const result = await sh.run(sh.select('h1', sh.parent), `<div><h1>one</h1><h2>two</h2><h3>three</h3></div>`)()
    if (isLeft(result)) throw result.left
    expect(du.isTag(result.right) && result.right.tagName).toBe('div')
  })

  it('should return recursively concatonate all inner text nodes', async () => {
    const result = await sh.run(sh.text, `<div><h1>one</h1><h2>two</h2><h3>three</h3></div>`)()
    if (isLeft(result)) throw result.left
    expect(result.right).toBe('onetwothree')
  })

  it('should return serialized dom nodes', async () => {
    const result = await sh.run(sh.html, `<div><h1>one</h1><h2>two</h2><h3>three</h3></div>`)()
    if (isLeft(result)) throw result.left
    expect(result.right).toBe('<div><h1>one</h1><h2>two</h2><h3>three</h3></div>')
  })

  it('should return all node attributes', async () => {
    const result = await sh.run(
      sh.select('div', sh.attributes),
      `<div style="background:blue" role="button">click me</div>`
    )()
    if (isLeft(result)) throw result.left
    expect(result.right).toEqual({ style: 'background:blue', role: 'button' })
  })

  it('should return style attribute', async () => {
    const result = await sh.run(
      sh.select('div', sh.attr('style')),
      `<div style="background:blue" role="button">click me</div>`
    )()
    if (isLeft(result)) throw result.left
    expect(result.right).toEqual('background:blue')
  })
})

describe('utilities', () => {
  it('should return first node matching a css selector', async () => {
    const result = await sh.run(
      sh.nullable(sh.select('h9')),
      `<div><h1>hello</h1><h2>world</h2><h2>something</h2></div>`
    )()
    if (isLeft(result)) throw result.left
    expect(result.right).toBe(null)
  })
})

describe('Crawling', () => {
  it('should handle complex query', async () => {
    const axios: any = {}

    const connection = connect((url, _ctx) => Promise.resolve([page(url as '/' | '/one'), { hostname: url }]), {
      hostname: '/'
    })

    const trimText = pipe(
      sh.text,
      map((y) => y.trim())
    )
    const result = await sh.run(
      goTo(
        '/',
        sh.select({
          title: sh.select('title', sh.text),
          posts: sh.select(
            ['li'],
            sh.select({
              title: sh.select('h4', sh.parent, 'h4', trimText),
              body: sh.select('p', sh.text),
              bod_html: sh.select('p', sh.html),
              image: goTo(
                sh.select('a', sh.attr('href')),
                sh.select({
                  src: sh.select('img', sh.attr('src'))
                })
              )
            })
          )
        })
      ),
      { connection }
    )()

    if (isLeft(result)) throw result.left
    expect(result.right).toEqual({
      title: 'Shears Test HTML',
      posts: [
        {
          title: 'Update 1',
          body: 'lorem ipsum',
          bod_html: '<p>lorem ipsum</p>',
          image: { src: 'one.jpeg' }
        },
        {
          title: 'Update 2',
          body: 'lorem ipsum',
          bod_html: '<p>lorem ipsum</p>',
          image: { src: 'two.jpeg' }
        }
      ]
    })
  })

  it('should return DOM AST', async () => {
    const fn = jest.fn()
    const connection = connect(
      (url, ctx) => {
        if (fn) fn(url, ctx)
        return Promise.resolve([`<h1>hello</h1>`, ctx])
      },
      { hostname: 'http://helloworld.com' }
    )
    const result = await sh.run(
      goTo('/', (r) => TE.of(r)),
      { connection }
    )()
    if (isLeft(result)) throw result.left
    expect(fn.mock.calls[0]).toEqual(['/', { hostname: 'http://helloworld.com' }])
    expect(result.right?.connection?.ctx).toEqual({ hostname: 'http://helloworld.com' })
  })

  it('should throw error when not connection object is found', async () => {
    const result = await sh.run(goTo('/', (r) => TE.of(r)))()
    if (isRight(result)) throw new Error('Supposed to fail')
    expect(result.left instanceof Error).toBe(true)
  })
})

const page = (route: '/' | '/one' | '/two') =>
  ((
    {
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
                    <h4> Update 1 </h4>
                    <p>lorem ipsum</p>
                    <a href="/one">go to update 1</a>
                  </li>
                  <li>
                    <h4> Update 2 </h4>
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
    } as const
  )[route])
