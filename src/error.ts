class QueryError extends Error {
  constructor(fn?: Function) {
    super()
    Error.captureStackTrace(this, fn)
  }
}

export const createErrorStackMap = (fn?: Function, message?: string) => {
  const stackError = new QueryError(fn || createErrorStackMap)
  return (_error: Error) => {
    _error.stack = stackError.stack
    return stackError
  }
}
