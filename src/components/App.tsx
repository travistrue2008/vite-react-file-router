import router from 'virtual:file-router/routes.jsx'
import { RouterProvider } from 'react-router'

export default function App () {
  return <RouterProvider router={router} />
}
