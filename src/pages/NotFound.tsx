import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 className="text-3xl font-semibold">Page introuvable</h1>
      <Link to="/" className="btn-primary">Retour à l'accueil</Link>
    </div>
  )
}
