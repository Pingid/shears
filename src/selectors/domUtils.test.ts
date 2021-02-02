import { isLeft } from 'fp-ts/lib/Either'
import * as du from 'domutils'

import { parent, siblings, nextSibling, text, html, attributes } from './domUtils'
import { $ } from './cssSelect'
import { run } from '../shear'

it('Should return sibling nodes', async () => {
  const result = await run($('h1', parent()), `<div><h1>one</h1><h2>two</h2><h3>three</h3></div>`)()
  if (isLeft(result)) throw result.left
  expect(du.isTag(result.right) && result.right.tagName).toBe('div')
})

it('Should return sibling nodes', async () => {
  const result = await run($('h1', siblings()), `<div><h1>one</h1><h2>two</h2><h3>three</h3></div>`)()
  if (isLeft(result)) throw result.left
  expect(result.right.map((x) => (du.isTag(x) ? x.name : x.type))).toEqual(['h1', 'h2', 'h3'])
})

it('Should return next node sibling', async () => {
  const result = await run($('h1', nextSibling()), `<div><h1>one</h1><h2>two</h2><h3>three</h3></div>`)()
  if (isLeft(result)) throw result.left
  expect(du.isTag(result.right) && (result.right as any).name == 'h2').toBe(true)
})

it('Should return recursively concatonate all inner text nodes', async () => {
  const result = await run(text(), `<div><h1>one</h1><h2>two</h2><h3>three</h3></div>`)()
  if (isLeft(result)) throw result.left
  expect(result.right).toBe('onetwothree')
})

it('Should return serialized dom nodes', async () => {
  const result = await run(html(), `<div><h1>one</h1><h2>two</h2><h3>three</h3></div>`)()
  if (isLeft(result)) throw result.left
  expect(result.right).toBe('<div><h1>one</h1><h2>two</h2><h3>three</h3></div>')
})

it('Should return all node attributes', async () => {
  const result = await run($('div', attributes()), `<div style="background:blue" role="button">click me</div>`)()
  if (isLeft(result)) throw result.left
  expect(result.right).toEqual({ style: 'background:blue', role: 'button' })
})

it('Should return style attribute', async () => {
  const result = await run($('div', attributes('style')), `<div style="background:blue" role="button">click me</div>`)()
  if (isLeft(result)) throw result.left
  expect(result.right).toEqual('background:blue')
})

it('Should return role attribute', async () => {
  const result = await run(
    $(
      'div',
      attributes((x) => x.role)
    ),
    `<div style="background:blue" role="button">click me</div>`
  )()
  if (isLeft(result)) throw result.left
  expect(result.right).toEqual('button')
})
