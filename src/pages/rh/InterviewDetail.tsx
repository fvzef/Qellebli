import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  INTERVIEW_RESULT_LABELS, INTERVIEW_STATUS_LABELS, RATING_CRITERIA, toLocalInput,
  type InterviewResult, type InterviewStatus,
} from '../../lib/interviewTypes'
import { INTERVIEW_SELECT, type InterviewRow } from './Interviews'

interface Recruiter { id: string; full_name: string; email: string }

export default function InterviewDetail() {
  const { id } = useParams()

  const q = useQuery({
    queryKey: ['interview', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('interviews').select(INTERVIEW_SELECT).eq('id', id!).single()
      if (error) throw error
      return data as unknown as InterviewRow
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

  if (q.isLoading) return <p className="text-sm text-muted">Chargement…</p>
  if (!q.data) return <p className="text-sm text-danger">Entretien introuvable.</p>
  return <DetailForm interview={q.data} recruiters={recruitersQ.data ?? []} />
}

function Rating({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${label} : ${n} sur 5`}
            onClick={() => onChange(value === n ? null : n)}
            className={`h-8 w-8 rounded-lg border text-sm transition-colors ${
              value !== null && n <= value ? 'border-accent bg-accent text-white' : 'border-line bg-white hover:bg-beige-100'}`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

function DetailForm({ interview, recruiters }: { interview: InterviewRow; recruiters: Recruiter[] }) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [when, setWhen] = useState(toLocalInput(interview.scheduled_at))
  const [location, setLocation] = useState(interview.location ?? '')
  const [interviewerId, setInterviewerId] = useState(interview.interviewer_id)
  const [status, setStatus] = useState<InterviewStatus>(interview.status)
  const [ratings, setRatings] = useState({
    score_communication: interview.score_communication,
    score_motivation: interview.score_motivation,
    score_skills: interview.score_skills,
    score_fit: interview.score_fit,
  })
  const [comments, setComments] = useState(interview.comments ?? '')
  const [result, setResult] = useState<InterviewResult | ''>(interview.result ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const rated = Object.values(ratings).filter((v): v is number => v !== null)
  const average = rated.length ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1) : null
  const app = interview.applications

  const refresh = () => Promise.all(['rh-interviews', 'interview', 'rh-app', 'rh-applications']
    .map((k) => qc.invalidateQueries({ queryKey: [k] })))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null); setSaved(false)
    // Enregistrer une note ou un résultat marque l'entretien comme réalisé
    const nextStatus: InterviewStatus = status === 'programme' && (rated.length > 0 || result) ? 'realise' : status
    const { error } = await supabase.from('interviews').update({
      scheduled_at: new Date(when).toISOString(),
      location: location.trim() || null,
      interviewer_id: interviewerId,
      status: nextStatus,
      ...ratings,
      comments: comments.trim() || null,
      result: result || null,
    }).eq('id', interview.id)
    if (error) setError(error.message)
    else { setStatus(nextStatus); setSaved(true); await refresh() }
    setBusy(false)
  }

  const remove = async () => {
    if (!window.confirm('Supprimer cet entretien ?')) return
    const { error } = await supabase.from('interviews').delete().eq('id', interview.id)
    if (error) return setError(error.message)
    await refresh()
    navigate('/rh/entretiens')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/rh/entretiens" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} /> Retour aux entretiens
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Entretien — {app?.candidates?.profiles?.full_name || '—'}</h1>
          <p className="mt-1 text-sm text-muted">
            {app?.offers?.title}
            {app && <> · <Link to={`/rh/candidatures/${app.id}`} className="font-medium text-accent hover:underline">Voir la fiche candidat</Link></>}
          </p>
        </div>
        <button onClick={remove} className="btn-ghost text-danger"><Trash2 size={16} /> Supprimer</button>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-5">
        <section className="card grid gap-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Planification</h2>
          <div>
            <label className="label" htmlFor="when">Date et heure</label>
            <input id="when" type="datetime-local" required className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="who">Recruteur responsable</label>
            <select id="who" className="input" value={interviewerId} onChange={(e) => setInterviewerId(e.target.value)}>
              {recruiters.map((r) => <option key={r.id} value={r.id}>{r.full_name || r.email}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="loc">Lieu ou lien</label>
            <input id="loc" className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="st">Statut</label>
            <select id="st" className="input" value={status} onChange={(e) => setStatus(e.target.value as InterviewStatus)}>
              {Object.entries(INTERVIEW_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </section>

        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Évaluation de l'entretien</h2>
            {average && <span className="text-sm text-muted">Moyenne : <strong className="text-accent-dark">{average}/5</strong></span>}
          </div>
          {RATING_CRITERIA.map((c) => (
            <Rating key={c.key} label={c.label} value={ratings[c.key]}
              onChange={(v) => setRatings({ ...ratings, [c.key]: v })} />
          ))}
          <div>
            <label className="label" htmlFor="com">Commentaires</label>
            <textarea id="com" rows={4} className="input" value={comments} onChange={(e) => setComments(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="res">Résultat de l'entretien</label>
            <select id="res" className="input sm:w-64" value={result} onChange={(e) => setResult(e.target.value as InterviewResult | '')}>
              <option value="">Non renseigné</option>
              {Object.entries(INTERVIEW_RESULT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <p className="text-xs text-muted">
            Ces notes sont internes : le candidat ne voit que la date et le lieu. Enregistrer une note ou un résultat
            passe l'entretien à « Réalisé ». La décision finale se prend sur la fiche candidat.
          </p>
        </section>

        {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
          {saved && <span className="text-sm text-accent-dark">Enregistré ✓</span>}
        </div>
      </form>
    </div>
  )
}
