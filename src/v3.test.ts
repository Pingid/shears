import { pipe, flow } from '@effect-ts/core/Function'
import { query, text, attr } from './v3'

let result = query(
  'div > ul',
  ['li'],
  ['p'],
  query({
    text: text(''),
    links: attr('href', ['a'])
  })
)
