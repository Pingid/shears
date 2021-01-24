import { isLeft } from 'fp-ts/lib/Either'
import * as du from 'domutils'

import { run, $, $$, join, parent, siblings, nextSibling, text, html, attributes, attr, fork, each } from './index'

it('Should return first node matching a css selector', async () => {
  const result = await run($('h2'), `<div><h1>hello</h1><h2>world</h2><h2>something</h2></div>`)()
  if (isLeft(result)) throw result.left
  expect(du.isTag(result.right) && result.right.name == 'h2').toBe(true)
})

it('Should return all nodes matching a css selector', async () => {
  const result = await run($$('div > *'), `<div><h1>hello</h1><h2>world</h2></div>`)()
  if (isLeft(result)) throw result.left
  expect(result.right.length).toBe(2)
  expect(du.isTag(result.right[0]) && (result.right[0] as any).name == 'h1').toBe(true)
  expect(du.isTag(result.right[1]) && (result.right[1] as any).name == 'h2').toBe(true)
})

it('Should join multipe shears together', async () => {
  const result = await run(join($('ul'), $('li'), $('h1')), `<div><ul><li><h1>foo</h1></li><li></li></ul></div>`)()
  if (isLeft(result)) throw result.left
  expect(du.isTag(result.right) && (result.right as any).name == 'h1').toBe(true)
})

it('Should return parent node', async () => {
  const result = await run(join($('h1'), parent()), `<div><section><h1>foobar</h1></section></div>`)()
  if (isLeft(result)) throw result.left
  expect(du.isTag(result.right) && (result.right as any).name == 'section').toBe(true)
})

it('Should return sibling nodes', async () => {
  const result = await run(join($('h1'), siblings()), `<div><h1>one</h1><h2>two</h2><h3>three</h3></div>`)()
  if (isLeft(result)) throw result.left
  expect(result.right.map((x) => (du.isTag(x) ? x.name : x.type))).toEqual(['h1', 'h2', 'h3'])
})

it('Should return next node sibling', async () => {
  const result = await run(join($('h1'), nextSibling()), `<div><h1>one</h1><h2>two</h2><h3>three</h3></div>`)()
  if (isLeft(result)) throw result.left
  expect(du.isTag(result.right) && (result.right as any).name == 'h2').toBe(true)
})

it('Should return recursively concatonate all inner text nodes', async () => {
  const result = await run(text, `<div><h1>one</h1><h2>two</h2><h3>three</h3></div>`)()
  if (isLeft(result)) throw result.left
  expect(result.right).toBe('onetwothree')
})

it('Should return serialized dom nodes', async () => {
  const result = await run(html, `<div><h1>one</h1><h2>two</h2><h3>three</h3></div>`)()
  if (isLeft(result)) throw result.left
  expect(result.right).toBe('<div><h1>one</h1><h2>two</h2><h3>three</h3></div>')
})

it('Should return all node attributes', async () => {
  const result = await run(join($('div'), attributes()), `<div style="background:blue" role="button">click me</div>`)()
  if (isLeft(result)) throw result.left
  expect(result.right).toEqual({ style: 'background:blue', role: 'button' })
})

it('Should return single node attribute', async () => {
  const result = await run(join($('div'), attr('style')), `<div style="background:blue" role="button">click me</div>`)()
  if (isLeft(result)) throw result.left
  expect(result.right).toEqual('background:blue')
})

it('Should resolve object structured shears selectors', async () => {
  const result = await run(
    fork({ h1: join($('h1'), text), h2: join($('h2'), text) }),
    `<div><h1>foo</h1><h2>bar</h2></div>`
  )()
  if (isLeft(result)) throw result.left
  expect(result.right).toEqual({ h1: 'foo', h2: 'bar' })
})

it('Should resolve array structured shears selectors', async () => {
  const result = await run(fork([join($('h1'), text), join($('h2'), text)]), `<div><h1>foo</h1><h2>bar</h2></div>`)()
  if (isLeft(result)) throw result.left
  expect(result.right).toEqual(['foo', 'bar'])
})

it('Should run shears selector on array of inputs', async () => {
  const result = await run(
    join($$('li'), each(join($('h1'), text))),
    `<ul><li><h1>one</h1></li><li><h1>two</h1></li><li><h1>three</h1></li></ul>`
  )()
  if (isLeft(result)) throw result.left
  expect(result.right).toEqual(['one', 'two', 'three'])
})
