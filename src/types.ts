import { Node } from 'domhandler'
import { TaskEither } from 'fp-ts/TaskEither'
import { ReaderTaskEither } from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/lib/pipeable'

export type Error = string
export type Parsed = Node | Node[]

export type Get<A> = (input: string, next: A) => TaskEither<Error, { data: Parsed; next: A }>
export type Context<R, A> = { get: Get<A>; next: A; data: R }

export type Shear<R, A, N> = ReaderTaskEither<Context<R, N>, Error, A>

// Utility
export type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R
