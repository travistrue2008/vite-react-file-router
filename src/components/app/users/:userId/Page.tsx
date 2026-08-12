import { useParams } from "react-router"

export default function Page() {
  const { userId } = useParams()

  return <div>User ID: {userId}</div>
}
