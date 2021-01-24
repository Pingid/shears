export class QueryError extends Error {
  constructor(m?: string, fn?: Function) {
    super(m)
    Error.captureStackTrace(this, fn)
  }
}

export const createErrorStackMap = (fn?: Function, message?: string) => {
  const stackError = new QueryError(message, fn || createErrorStackMap)
  return (_error: Error | QueryError) => {
    const error = new QueryError()
    error.stack = stackError.stack
    error.message = _error.message || stackError.message
    return error
  }
}
