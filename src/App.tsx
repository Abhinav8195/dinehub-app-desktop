import { RouterProvider } from 'react-router-dom'
import { createAppRouter } from '@/router/createAppRouter'

const router = createAppRouter()

export default function App() {
  return <RouterProvider router={router} />
}
