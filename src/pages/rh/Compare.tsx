import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { STATUS_LABELS, type ApplicationStatus } from '../../lib/constants'
import {
  EDUCATION_LABELS, LANGUAGE_LEVEL_LABELS,
  type EducationLevel, type LanguageRow, type Project, type Skill, type Experience,
} from '../../lib/profileTypes'
import { num, one } from '../../lib/rhTypes'
import ScoreBadge from '../../components/ScoreBadge'

interface CompareApp {
  id: string
  offer_id: string
  candidate_id: string
  status: ApplicationStatus
  offers: { title: string } | null
  candidates: {
    education_level: EducationLevel | null
    school: string | null
    field_of_study: string | null
    profiles: { full_name: string } | null
  } | null
  evaluations: Record<string, number> | Record<string, number>[] | null
}

interface PickRow {
  id: string
  offer_id: string
  offers: { title: string } | null
  candidates: { profiles: { full_name: string } | null } | null
  evaluations: { score_global: number } | { score_global: number }[] | null
}

const SKILL_LEVELS = ['Notions', 'Débutant', 'Intermédiaire', 'Avancé', 'Expert']

export default function Compare() {
  const [params, setParams] = useSearchParams()
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean)

  return ids.length >= 2
    ? <Comparison ids={ids} onReset={() => setParams({})} />
    : <Picker onCompare={(sel) => setParams({ ids: sel.join(',') })} />
}

function Picker({ onCompare }: { onCompare: (ids: string[]) => void }) {
  const [offerId, setOfferId] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['compare-picker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('id, offer_id, offers(title), candidates(profiles(full_name)), evaluations(score_global)')
      if (error) throw error
      return (data ?? []) as unknown as PickRow[]
    },
  })

  const rows = data ?? []
  const offers = [...new Map(rows.map((r) => [r.offer_id, r.offers?.title ?? 'Offre'])).entries()]
  const list = rows.filter((r) => r.offer_id === offerId)
  const toggle = (id: string) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : s.length < 4 ? [...s, id] : s)

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Comparaison des candidats</h1>
      <p className="mt-1 text-sm text-muted">Choisissez une offre, puis 2 à 4 candidats à comparer.</p>

      <div className="card mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="offer">Offre</label>
          <select id="offer" className="input" value={offerId} onChange={(e) => { setOfferId(e.target.value); setSelected([]) }}>
            <option value="">Sélectionner une offre…</option>
            {offers.map(([id, t]) => <option key={id} value={id}>{t}</option>)}
          </select>
        </div>
        {isLoading && <p className="text-sm text-muted">Chargement…</p>}
        {!isLoading && offers.length === 0 && <p className="text-sm text-muted">Aucune candidature reçue pour le moment.</p>}
        {offerId && (
          <ul className="space-y-2">
            {list.map((r) => (
              <li key={r.id}>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-line p-3 hover:bg-beige-50">
                  <span className="flex items-center gap-3">
                    <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
                    <span className="text-sm font-medium">{r.candidates?.profiles?.full_name || '—'}</span>
                  </span>
                  <ScoreBadge score={one(r.evaluations)?.score_global} />
                </label>
              </li>
            ))}
          </ul>
        )}
        <button disabled={selected.length < 2} onClick={() => onCompare(selected)} className="btn-primary">
          Comparer {selected.length > 0 && `(${selected.length})`}
        </button>
      </div>
    </div>
  )
}

function Comparison({ ids, onReset }: { ids: string[]; onReset: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['compare', ids.join(',')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('id, offer_id, candidate_id, status, offers(title), candidates(education_level, school, field_of_study, profiles(full_name)), evaluations(*)')
        .in('id', ids)
      if (error) throw error
      const apps = (data ?? []) as unknown as CompareApp[]
      const cids = apps.map((a) => a.candidate_id)
      const [skills, projects, languages, experiences] = await Promise.all([
        supabase.from('candidate_skills').select('*').in('candidate_id', cids),
        supabase.from('candidate_projects').select('*').in('candidate_id', cids),
        supabase.from('candidate_languages').select('*').in('candidate_id', cids),
        supabase.from('candidate_experiences').select('*').in('candidate_id', cids),
      ])
      return {
        apps,
        skills: (skills.data ?? []) as (Skill & { candidate_id: string })[],
        projects: (projects.data ?? []) as (Project & { candidate_id: string })[],
        languages: (languages.data ?? []) as (LanguageRow & { candidate_id: string })[],
        experiences: (experiences.data ?? []) as (Experience & { candidate_id: string })[],
      }
    },
  })

  if (isLoading) return <p className="text-sm text-muted">Chargement…</p>
  if (!data || data.apps.length === 0) return <p className="text-sm text-danger">Comparaison impossible.</p>

  const apps = ids.map((id) => data.apps.find((a) => a.id === id)).filter((a): a is CompareApp => Boolean(a))
  const ev = (a: CompareApp, key: string): number | null => {
    const e = one(a.evaluations)
    return e ? num(e[key]) : null
  }

  const Row = ({ title, cell }: { title: string; cell: (a: CompareApp) => React.ReactNode }) => (
    <tr className="border-b border-line align-top last:border-0">
      <th className="w-40 bg-beige-50 px-4 py-3 text-left text-sm font-medium">{title}</th>
      {apps.map((a) => <td key={a.id} className="px-4 py-3 text-sm">{cell(a)}</td>)}
    </tr>
  )

  const withScore = (a: CompareApp, key: string, body: React.ReactNode) => (
    <div className="space-y-2">
      <ScoreBadge score={ev(a, key)} />
      <div className="text-xs text-muted">{body}</div>
    </div>
  )

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Comparaison des candidats</h1>
          <p className="mt-1 text-sm text-muted">
            Offre : {apps[0].offers?.title}. La comparaison éclaire votre choix sans désigner de gagnant.
          </p>
        </div>
        <button onClick={onReset} className="btn-ghost">Changer la sélection</button>
      </div>

      <div className="card mt-6 overflow-x-auto p-0">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-line">
              <th className="bg-beige-50" />
              {apps.map((a) => (
                <th key={a.id} className="px-4 py-3 text-left">
                  <Link to={`/rh/candidatures/${a.id}`} className="font-semibold text-accent hover:underline">
                    {a.candidates?.profiles?.full_name || '—'}
                  </Link>
                  <p className="mt-0.5 text-xs font-normal text-muted">{STATUS_LABELS[a.status]}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row title="Formation" cell={(a) => withScore(a, 'score_education', <>
              {a.candidates?.education_level ? EDUCATION_LABELS[a.candidates.education_level] : '—'}
              {a.candidates?.field_of_study && <><br />{a.candidates.field_of_study}</>}
              {a.candidates?.school && <><br />{a.candidates.school}</>}
            </>)} />
            <Row title="Compétences techniques" cell={(a) => withScore(a, 'score_skills',
              data.skills.filter((s) => s.candidate_id === a.candidate_id)
                .map((s) => `${s.name} (${SKILL_LEVELS[s.level - 1]})`).join(', ') || 'Aucune')} />
            <Row title="Projets" cell={(a) => withScore(a, 'score_projects',
              data.projects.filter((p) => p.candidate_id === a.candidate_id).map((p) => p.title).join(', ') || 'Aucun')} />
            <Row title="Langues" cell={(a) => withScore(a, 'score_languages',
              data.languages.filter((l) => l.candidate_id === a.candidate_id)
                .map((l) => `${l.language} (${LANGUAGE_LEVEL_LABELS[l.level]})`).join(', ') || 'Aucune')} />
            <Row title="Expériences" cell={(a) => withScore(a, 'score_experience',
              data.experiences.filter((x) => x.candidate_id === a.candidate_id).map((x) => x.title).join(', ') || 'Aucune')} />
            <Row title="Score global" cell={(a) => <ScoreBadge score={ev(a, 'score_global')} />} />
          </tbody>
        </table>
      </div>
    </div>
  )
}
