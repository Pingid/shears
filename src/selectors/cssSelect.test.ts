import { isLeft } from 'fp-ts/lib/Either'
import * as du from 'domutils'

import { $, $$ } from './cssSelect'
import { text } from './domUtils'
import { run } from '../index'

it('Should return first node matching a css selector', async () => {
  const result = await run($('h2'), `<div><h1>hello</h1><h2>world</h2><h2>something</h2></div>`)()
  if (isLeft(result)) throw result.left
  expect(du.isTag(result.right) && result.right.name == 'h2').toBe(true)
})

it('Should accept nesting', async () => {
  const result = await run($('h1', $('span')), `<div><h1>hello<span>world</span></h1><h2>something</h2></div>`)()
  if (isLeft(result)) throw result.left
  expect(du.isTag(result.right) && result.right.name == 'span').toBe(true)
})

it('Should return all nodes matching a css selector', async () => {
  const result = await run($$('div > *'), `<div><h1>hello</h1><h2>world</h2></div>`)()
  if (isLeft(result)) throw result.left
  expect(result.right.length).toBe(2)
  expect(du.isTag(result.right[0]) && (result.right[0] as any).name == 'h1').toBe(true)
  expect(du.isTag(result.right[1]) && (result.right[1] as any).name == 'h2').toBe(true)
})

it('Should return inner text for all child elements', async () => {
  const result = await run($$('div > *', text()), `<div><h1>hello</h1><h2>world</h2></div>`)()
  if (isLeft(result)) throw result.left
  expect(result.right).toEqual(['hello', 'world'])
})
