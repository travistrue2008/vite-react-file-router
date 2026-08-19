import { useParams, useRouteLoaderData } from 'react-router'

export default function Page () {
  const { userId } = useParams()
  const data = useRouteLoaderData('users') as { name: string } | undefined

  return <div>User {userId} of {data?.name}</div>
}
