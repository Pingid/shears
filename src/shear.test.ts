import { isLeft } from 'fp-ts/lib/Either'

import { $ } from './selectors'
import { run, nullable } from './shear'

it('Should return first node matching a css selector', async () => {
  const result = await run(nullable($('h9')), `<div><h1>hello</h1><h2>world</h2><h2>something</h2></div>`)()
  if (isLeft(result)) throw result.left
  console.log(result)
})
