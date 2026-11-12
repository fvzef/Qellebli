import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLE_LABELS, homeForRole } from '../lib/constants'
import Logo from '../components/Logo'
import GoogleButton from '../components/GoogleButton'

export default function Login() {
  const { session, profile, loading, accounts, signIn, switchAccount } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const adding = params.get('ajout') === '1'
  // Compte actif à l'arrivée sur la page : en mode « ajout », on ne redirige qu'une fois un AUTRE compte connecté
  const startUser = useRef<string | null | undefined>(undefined)
  if (!loading && startUser.current === undefined) startUser.current = session?.user.id ?? null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Retour de Google avec une erreur (inscriptions fermées, adresse non autorisée…)
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const desc = params.get('error_description')
    if (!desc) return
    const text = desc.replace(/\+/g, ' ')
    if (/Database error saving new user/i.test(text)) setError("Inscription refusée : cette adresse e-mail n'est pas autorisée.")
    else if (/signups? not allowed/i.test(text)) setError('Les inscriptions sont fermées pour le moment.')
    else setError(text)
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  if (session && profile && (!adding || session.user.id !== startUser.current)) {
    return <Navigate to={homeForRole(profile.role)} replace />
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    const err = await signIn(email.trim(), password)
    if (err) setError(err)
    else if (adding) navigate('/', { replace: true })
    setBusy(false)
  }

  const resume = async (id: string) => {
    setBusy(true); setError(null)
    const err = await switchAccount(id)
    if (err) setError(err)
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-beige-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo />
          <p className="text-sm text-muted">Connecting Young Talents to Opportunities.</p>
        </div>
        {adding && session && (
          <p className="mb-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-dark">
            Ajout d'un compte : vos comptes déjà connectés restent disponibles dans « Changer d'espace ».
            <Link to={homeForRole(profile?.role ?? 'candidat')} className="ml-2 font-medium underline">Annuler</Link>
          </p>
        )}
        {!adding && !session && accounts.length > 0 && (
          <div className="card mb-3 space-y-2">
            <h2 className="text-sm font-semibold">Reprendre avec un compte enregistré</h2>
            {accounts.map((a) => (
              <button key={a.userId} type="button" disabled={busy} onClick={() => resume(a.userId)}
                className="btn-ghost w-full justify-between text-left">
                <span className="truncate">{a.name || a.email}</span>
                <span className="shrink-0 text-xs text-muted">{ROLE_LABELS[a.role]}</span>
              </button>
            ))}
          </div>
        )}
        <form onSubmit={onSubmit} className="card space-y-4">
          <h1 className="text-xl font-semibold">{adding ? 'Ajouter un compte' : 'Connexion'}</h1>
          <GoogleButton />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" className="input"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">Mot de passe</label>
            <input id="password" type="password" required autoComplete="current-password" className="input"
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Connexion…' : 'Se connecter'}
          </button>
          <p className="text-center text-sm text-muted">
            Pas encore de compte ? <Link to="/inscription" className="font-medium text-accent hover:underline">Créer un compte candidat</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
