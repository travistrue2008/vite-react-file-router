import { isRouteErrorResponse, useRouteError } from 'react-router'

export default function ErrorBoundary () {
  const error = useRouteError()

  if (!isRouteErrorResponse(error)) return <div>not a response</div>

  const { why } = error.data as { why: string }

  return <div>Teapot boundary: {error.status} {why}</div>
}
