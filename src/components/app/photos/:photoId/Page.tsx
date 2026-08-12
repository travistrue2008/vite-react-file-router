import { useParams } from 'react-router'

export default function Page () {
  const { photoId } = useParams()

  return <div>Photo ID: {photoId}</div>
}
