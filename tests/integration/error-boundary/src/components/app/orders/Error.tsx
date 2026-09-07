import { useRouteError } from 'react-router'

export default function ErrorBoundary () {
  const error = useRouteError() as Error

  return <div>Orders boundary: {error.message}</div>
}
