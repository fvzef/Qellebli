import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeForRole } from '../lib/constants'
import Logo from '../components/Logo'
import GoogleButton from '../components/GoogleButton'

export default function Register() {
  const { session, profile, signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session && profile) return <Navigate to={homeForRole(profile.role)} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null); setInfo(null)
    if (password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.')
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas.')
    setBusy(true)
    const res = await signUp(fullName.trim(), email.trim(), password)
    if (res.error) setError(res.error)
    else if (res.needsConfirmation) setInfo('Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous.')
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-beige-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo />
          <p className="text-sm text-muted">Créez votre compte candidat</p>
        </div>
        <form onSubmit={onSubmit} className="card space-y-4">
          <h1 className="text-xl font-semibold">Inscription</h1>
          <GoogleButton />
          <div>
            <label className="label" htmlFor="name">Nom complet</label>
            <input id="name" required className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" className="input"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">Mot de passe (8 caractères min.)</label>
            <input id="password" type="password" required autoComplete="new-password" className="input"
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Confirmer le mot de passe</label>
            <input id="confirm" type="password" required autoComplete="new-password" className="input"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          {info && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-dark">{info}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Création…' : 'Créer mon compte'}
          </button>
          <p className="text-center text-sm text-muted">
            Déjà inscrit ? <Link to="/connexion" className="font-medium text-accent hover:underline">Se connecter</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
