import { useLocation, useNavigate } from 'react-router'

// Closes a /tasks/:id or /notes/:id detail view: back to wherever the user
// came from (the list, Time Log, Home...), or to `listPath` when the detail
// was opened directly from a link and there's nothing in-app to go back to.
export function useCloseDetail(listPath: string): () => void {
  const navigate = useNavigate()
  const location = useLocation()
  return () => (location.key !== 'default' ? navigate(-1) : navigate(listPath))
}
