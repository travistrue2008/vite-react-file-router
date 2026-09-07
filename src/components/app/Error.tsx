import { isRouteErrorResponse, useRouteError } from 'react-router'

export default function ErrorBoundary () {
  const error = useRouteError()

  // A thrown Response arrives as an ErrorResponse, which carries a status
  // rather than a message. Anything else is a genuine thrown value.
  if (isRouteErrorResponse(error)) {
    return <div>{error.status} {error.statusText}</div>
  }

  return <div>Something went wrong: {(error as Error).message}</div>
}
