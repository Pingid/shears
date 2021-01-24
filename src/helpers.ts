import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow } from 'fp-ts/lib/function'
import * as du from 'domutils'

import { $, attr, join, text } from './selectors'
import { Context } from './shear'

export const qt = flow((query: string) => join($(query), text))
export const qa = flow((query: string, attribute: string) => join($(query), attr(attribute)))
