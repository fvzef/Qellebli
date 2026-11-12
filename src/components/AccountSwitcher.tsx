import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, Plus, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ROLE_LABELS } from '../lib/constants'

/** Passer d'un espace (Candidat, RH, Direction) à un autre sans se déconnecter. */
export default function AccountSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, accounts, switchAccount, forgetAccount } = useAuth()
  const [open, setOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (!profile) return null

  const others = accounts.filter((a) => a.userId !== profile.id)

  const choose = async (id: string) => {
    setBusyId(id); setError(null)
    const err = await switchAccount(id)
    setBusyId(null)
    if (err) setError(err)
    else { setOpen(false); onNavigate?.() }
  }

  return (
    <div className="mb-2">
      <button type="button" className="btn-ghost w-full" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <ArrowLeftRight size={16} /> Changer d'espace
      </button>

      {open && (
        <div className="mt-2 space-y-1 rounded-lg border border-line bg-white p-2 text-sm shadow-sm">
          <div className="flex items-center justify-between rounded-md bg-accent-soft px-2 py-1.5">
            <span className="min-w-0">
              <span className="block truncate font-medium">{profile.full_name || profile.email}</span>
              <span className="text-xs text-muted">{ROLE_LABELS[profile.role]}</span>
            </span>
            <span className="ml-2 shrink-0 text-xs font-medium text-accent-dark">Actif</span>
          </div>

          {others.map((a) => (
            <div key={a.userId} className="flex items-center gap-1">
              <button type="button" disabled={busyId !== null} onClick={() => choose(a.userId)}
                className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-left hover:bg-beige-100 disabled:opacity-60">
                <span className="block truncate font-medium">{a.name || a.email}</span>
                <span className="text-xs text-muted">{busyId === a.userId ? 'Changement…' : ROLE_LABELS[a.role]}</span>
              </button>
              <button type="button" aria-label={`Oublier ${a.name || a.email}`} title="Oublier ce compte sur cet appareil"
                onClick={() => forgetAccount(a.userId)} className="rounded p-1 text-muted hover:text-danger">
                <X size={14} />
              </button>
            </div>
          ))}

          {others.length === 0 && (
            <p className="px-2 py-1 text-xs text-muted">Ajoutez un autre compte (RH, Direction, Candidat) pour passer de l'un à l'autre en un clic.</p>
          )}

          <Link to="/connexion?ajout=1" className="flex items-center gap-2 rounded-md px-2 py-1.5 font-medium text-accent hover:bg-beige-100">
            <Plus size={14} /> Ajouter un compte
          </Link>

          {error && <p className="rounded bg-danger-soft px-2 py-1 text-xs text-danger">{error}</p>}
          <p className="px-2 pt-1 text-[11px] leading-snug text-muted">
            Comptes mémorisés sur cet appareil. Utilisez cette fonction uniquement sur votre propre ordinateur ; « Déconnexion » oublie le compte actif.
          </p>
        </div>
      )}
    </div>
  )
}
