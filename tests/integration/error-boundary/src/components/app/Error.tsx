import { isRouteErrorResponse, useRouteError } from 'react-router'

export default function ErrorBoundary () {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return <div>Root boundary: {error.status} {error.statusText}</div>
  }

  return <div>Root boundary: {(error as Error).message}</div>
}
