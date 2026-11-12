import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

interface AppOption {
  id: string
  offers: { title: string } | null
  candidates: { profiles: { full_name: string } | null } | null
}
interface Recruiter { id: string; full_name: string; email: string }

export default function InterviewForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { session } = useAuth()
  const [params] = useSearchParams()

  const [applicationId, setApplicationId] = useState(params.get('application') ?? '')
  const [when, setWhen] = useState('')
  const [interviewerId, setInterviewerId] = useState(session?.user.id ?? '')
  const [location, setLocation] = useState('')
  const [comments, setComments] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const appsQ = useQuery({
    queryKey: ['interview-form-apps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('id, offers(title), candidates(profiles(full_name))')
        .not('status', 'in', '(acceptee,refusee)')
        .order('applied_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as AppOption[]
    },
  })

  const recruitersQ = useQuery({
    queryKey: ['recruiters'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email').eq('role', 'rh')
      if (error) throw error
      return (data ?? []) as Recruiter[]
    },
  })

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    const { error } = await supabase.from('interviews').insert({
      application_id: applicationId,
      scheduled_at: new Date(when).toISOString(),
      interviewer_id: interviewerId,
      location: location.trim() || null,
      comments: comments.trim() || null,
    })
    if (error) { setError(error.message); setBusy(false); return }
    await Promise.all(['rh-interviews', 'rh-applications', 'rh-app']
      .map((k) => qc.invalidateQueries({ queryKey: [k] })))
    navigate('/rh/entretiens')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/rh/entretiens" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} /> Retour aux entretiens
      </Link>
      <h1 className="text-2xl font-semibold">Programmer un entretien</h1>
      <p className="mt-1 text-sm text-muted">La candidature passera automatiquement au statut « Entretien programmé ».</p>

      <form onSubmit={onSubmit} className="card mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="app">Candidature *</label>
          <select id="app" required className="input" value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
            <option value="">Sélectionner…</option>
            {(appsQ.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.candidates?.profiles?.full_name || '—'} — {a.offers?.title ?? 'Offre'}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="when">Date et heure *</label>
            <input id="when" type="datetime-local" required className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="who">Recruteur responsable *</label>
            <select id="who" required className="input" value={interviewerId} onChange={(e) => setInterviewerId(e.target.value)}>
              <option value="">Sélectionner…</option>
              {(recruitersQ.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.full_name || r.email}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="loc">Lieu ou lien de visioconférence</label>
          <input id="loc" className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="com">Commentaires de préparation</label>
          <textarea id="com" rows={3} className="input" value={comments} onChange={(e) => setComments(e.target.value)} />
        </div>
        {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Enregistrement…' : 'Programmer'}</button>
          <Link to="/rh/entretiens" className="btn-ghost">Annuler</Link>
        </div>
      </form>
    </div>
  )
}
