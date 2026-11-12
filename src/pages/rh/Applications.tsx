import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { GitCompare } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { STATUS_LABELS, type ApplicationStatus } from '../../lib/constants'
import { EDUCATION_LABELS, type EducationLevel } from '../../lib/profileTypes'
import { formatDate } from '../../lib/offerTypes'
import { one } from '../../lib/rhTypes'
import StatusBadge from '../../components/StatusBadge'
import ScoreBadge from '../../components/ScoreBadge'

interface Row {
  id: string
  status: ApplicationStatus
  applied_at: string
  offer_id: string
  offers: { title: string } | null
  candidates: {
    education_level: EducationLevel | null
    school: string | null
    field_of_study: string | null
    profiles: { full_name: string; email: string } | null
  } | null
  evaluations: { score_global: number } | { score_global: number }[] | null
}

export default function RhApplications() {
  const navigate = useNavigate()
  const [offerId, setOfferId] = useState('')
  const [status, setStatus] = useState<ApplicationStatus | ''>('')
  const [education, setEducation] = useState<EducationLevel | ''>('')
  const [minScore, setMinScore] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'score' | 'date'>('score')
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['rh-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('id, status, applied_at, offer_id, offers(title), candidates(education_level, school, field_of_study, profiles(full_name, email)), evaluations(score_global)')
        .order('applied_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as Row[]
    },
  })

  const rows = data ?? []
  const offers = useMemo(() => {
    const m = new Map<string, string>()
    rows.forEach((r) => m.set(r.offer_id, r.offers?.title ?? 'Offre'))
    return [...m.entries()]
  }, [rows])

  const score = (r: Row): number | null => {
    const e = one(r.evaluations)
    return e ? Number(e.score_global) : null
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const min = minScore === '' ? null : Number(minScore)
    return rows
      .filter((r) =>
        (!offerId || r.offer_id === offerId) &&
        (!status || r.status === status) &&
        (!education || r.candidates?.education_level === education) &&
        (min === null || (score(r) ?? -1) >= min) &&
        (!q || [r.candidates?.profiles?.full_name, r.candidates?.profiles?.email, r.candidates?.school, r.candidates?.field_of_study]
          .some((x) => x?.toLowerCase().includes(q))))
      .sort((a, b) => sort === 'score'
        ? (score(b) ?? -1) - (score(a) ?? -1)
        : b.applied_at.localeCompare(a.applied_at))
  }, [rows, offerId, status, education, minScore, search, sort])

  const toggle = (id: string) => {
    setError(null)
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])
  }

  const compare = () => {
    const chosen = rows.filter((r) => selected.includes(r.id))
    if (new Set(chosen.map((r) => r.offer_id)).size > 1) return setError('Sélectionnez des candidats ayant postulé à la même offre.')
    if (chosen.length < 2) return setError('Sélectionnez au moins 2 candidats.')
    if (chosen.length > 4) return setError('Vous pouvez comparer 4 candidats au maximum.')
    navigate(`/rh/comparaison?ids=${selected.join(',')}`)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Candidatures reçues</h1>
          <p className="mt-1 text-sm text-muted">Le score est une aide à la décision : la décision finale reste la vôtre.</p>
        </div>
        <button onClick={compare} disabled={selected.length < 2} className="btn-primary">
          <GitCompare size={16} /> Comparer ({selected.length})
        </button>
      </div>

      {error && <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <input className="input lg:col-span-2" placeholder="Rechercher (nom, école, filière)…" value={search}
          onChange={(e) => setSearch(e.target.value)} aria-label="Rechercher" />
        <select className="input" value={offerId} onChange={(e) => setOfferId(e.target.value)} aria-label="Offre">
          <option value="">Toutes les offres</option>
          {offers.map(([id, t]) => <option key={id} value={id}>{t}</option>)}
        </select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus | '')} aria-label="Statut">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="input" value={education} onChange={(e) => setEducation(e.target.value as EducationLevel | '')} aria-label="Niveau d'études">
          <option value="">Tous niveaux</option>
          {Object.entries(EDUCATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <div className="flex gap-2">
          <input className="input" type="number" min={0} max={100} placeholder="Score min." value={minScore}
            onChange={(e) => setMinScore(e.target.value)} aria-label="Score minimum" />
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value as 'score' | 'date')} aria-label="Tri">
            <option value="score">Score ↓</option>
            <option value="date">Date ↓</option>
          </select>
        </div>
      </div>

      <div className="card mt-5 overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-beige-50 text-xs uppercase text-muted">
            <tr>
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3">Candidat</th>
              <th className="px-4 py-3">Offre</th>
              <th className="px-4 py-3">Formation</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="px-4 py-6 text-center text-muted">Chargement…</td></tr>}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-muted">Aucune candidature ne correspond.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-beige-50">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)}
                    aria-label="Sélectionner pour comparer" />
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{r.candidates?.profiles?.full_name || '—'}</p>
                  <p className="text-xs text-muted">{r.candidates?.profiles?.email}</p>
                </td>
                <td className="px-4 py-3">{r.offers?.title ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-muted">
                  {r.candidates?.education_level ? EDUCATION_LABELS[r.candidates.education_level] : '—'}
                  {r.candidates?.field_of_study && <><br />{r.candidates.field_of_study}</>}
                </td>
                <td className="px-4 py-3"><ScoreBadge score={score(r)} /></td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-xs text-muted">{formatDate(r.applied_at)}</td>
                <td className="px-4 py-3"><Link to={`/rh/candidatures/${r.id}`} className="font-medium text-accent hover:underline">Voir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
