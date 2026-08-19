import { Outlet, useLoaderData } from 'react-router'

export default function Layout () {
  const { name } = useLoaderData() as { name: string }

  return (
    <div>
      <div>Loaded: {name}</div>
      <Outlet />
    </div>
  )
}
