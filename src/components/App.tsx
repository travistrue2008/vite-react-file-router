import routes from 'virtual:file-router/routes.jsx'
import { createBrowserRouter, RouterProvider } from 'react-router'

// Built once at module scope: rebuilding per render would reset router state.
const router = createBrowserRouter(routes)

export default function App () {
  return <RouterProvider router={router} />
}
