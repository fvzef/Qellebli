import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, FileText, MinusCircle, RefreshCw, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { STATUS_LABELS, type ApplicationStatus } from '../../lib/constants'
import {
  EDUCATION_LABELS, EXPERIENCE_KIND_LABELS, LANGUAGE_LEVEL_LABELS, PROJECT_KIND_LABELS,
  type Candidate, type Experience, type LanguageRow, type Project, type Skill,
} from '../../lib/profileTypes'
import { OFFER_TYPE_LABELS, formatDate, formatDateTime, type Offer } from '../../lib/offerTypes'
import { CRITERIA, num, type Evaluation, type HistoryRow } from '../../lib/rhTypes'
import ScoreBar from '../../components/ScoreBar'
import StatusBadge from '../../components/StatusBadge'
import { InterviewResultBadge, InterviewStatusBadge } from '../../components/InterviewBadge'
import { useAuth } from '../../context/AuthContext'
import type { Decision, Interview } from '../../lib/interviewTypes'

interface AppFull {
  id: string
  status: ApplicationStatus
  applied_at: string
  cover_letter: string | null
  cv_path: string | null
  candidate_id: string
  offers: Offer
  candidates: Candidate & { profiles: { full_name: string; email: string } }
}

const SKILL_LEVELS = ['Notions', 'Débutant', 'Intermédiaire', 'Avancé', 'Expert']

export default function ApplicationReview() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const { session } = useAuth()

  const q = useQuery({
    queryKey: ['rh-app', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('*, offers(*), candidates(*, profiles(full_name, email))')
        .eq('id', id!).single()
      if (error) throw error
      const app = data as unknown as AppFull
      const cid = app.candidate_id
      const [skills, projects, languages, experiences, evaluation, history, interviews, decision] = await Promise.all([
        supabase.from('candidate_skills').select('*').eq('candidate_id', cid),
        supabase.from('candidate_projects').select('*').eq('candidate_id', cid),
        supabase.from('candidate_languages').select('*').eq('candidate_id', cid),
        supabase.from('candidate_experiences').select('*').eq('candidate_id', cid),
        supabase.from('evaluations').select('*').eq('application_id', id!).maybeSingle(),
        supabase.from('application_status_history').select('*').eq('application_id', id!).order('changed_at', { ascending: true }),
        supabase.from('interviews').select('*').eq('application_id', id!).order('scheduled_at', { ascending: true }),
        supabase.from('decisions').select('*').eq('application_id', id!).maybeSingle(),
      ])
      return {
        app,
        skills: (skills.data ?? []) as Skill[],
        projects: (projects.data ?? []) as Project[],
        languages: (languages.data ?? []) as LanguageRow[],
        experiences: (experiences.data ?? []) as Experience[],
        evaluation: (evaluation.data ?? null) as Evaluation | null,
        history: (history.data ?? []) as HistoryRow[],
        interviews: (interviews.data ?? []) as Interview[],
        decision: (decision.data ?? null) as Decision | null,
      }
    },
  })

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['rh-app', id] })
    await qc.invalidateQueries({ queryKey: ['rh-applications'] })
  }

  if (q.isLoading) return <p className="text-sm text-muted">Chargement…</p>
  if (!q.data) return <p className="text-sm text-danger">Candidature introuvable.</p>

  const { app, skills, projects, languages, experiences, evaluation, history, interviews, decision } = q.data
  const cand = app.candidates
  const offer = app.offers
  const isFinal = app.status === 'acceptee' || app.status === 'refusee'
  const INTERMEDIATE: ApplicationStatus[] = ['recue', 'en_verification', 'en_evaluation', 'preselectionnee', 'entretien_programme']

  const changeStatus = async (status: ApplicationStatus) => {
    if (status === app.status) return
    setError(null)
    const { error } = await supabase.from('applications').update({ status }).eq('id', app.id)
    if (error) setError(error.message)
    else await refresh()
  }

  const decide = async (d: 'acceptee' | 'refusee') => {
    if (!session) return
    if (!window.confirm(`Confirmer la décision « ${STATUS_LABELS[d]} » pour ${cand.profiles.full_name} ? Le candidat verra le nouveau statut.`)) return
    setBusy(true); setError(null)
    const up = await supabase.from('applications').update({ status: d }).eq('id', app.id)
    if (up.error) { setError(up.error.message); setBusy(false); return }
    const dec = await supabase.from('decisions').upsert({
      application_id: app.id, decision: d, note: note.trim() || null,
      decided_by: session.user.id, decided_at: new Date().toISOString(),
    }, { onConflict: 'application_id' })
    if (dec.error) setError(dec.error.message)
    else { setNote(''); await refresh() }
    setBusy(false)
  }

  const reopen = async () => {
    if (!window.confirm('Rouvrir ce dossier ? La décision finale sera annulée.')) return
    setBusy(true); setError(null)
    const up = await supabase.from('applications')
      .update({ status: 'en_evaluation', decided_at: null, decision_by: null }).eq('id', app.id)
    if (up.error) { setError(up.error.message); setBusy(false); return }
    await supabase.from('decisions').delete().eq('application_id', app.id)
    await refresh()
    setBusy(false)
  }

  const recompute = async () => {
    setBusy(true); setError(null)
    const { error } = await supabase.rpc('recompute_evaluation', { p_application: app.id })
    if (error) setError(error.message)
    else await refresh()
    setBusy(false)
  }

  const openCv = async () => {
    if (!app.cv_path) return
    const { data, error } = await supabase.storage.from('cvs').createSignedUrl(app.cv_path, 60)
    if (error || !data) return setError("Impossible d'ouvrir le CV.")
    window.open(data.signedUrl, '_blank')
  }

  // Vérification d'éligibilité (information, jamais bloquante)
  const rank = (l: string | null) => (l ? Object.keys(EDUCATION_LABELS).indexOf(l) : -1)
  const checks: { label: string; ok: boolean | null; detail: string }[] = [
    {
      label: "Niveau d'études minimum",
      ok: offer.min_education ? rank(cand.education_level) >= rank(offer.min_education) : null,
      detail: offer.min_education
        ? `Requis : ${EDUCATION_LABELS[offer.min_education]} · Candidat : ${cand.education_level ? EDUCATION_LABELS[cand.education_level] : 'non renseigné'}`
        : 'Aucun minimum exigé',
    },
    {
      label: 'CV fourni',
      ok: Boolean(app.cv_path),
      detail: app.cv_path ? 'CV joint à la candidature' : 'Aucun CV',
    },
    {
      label: 'Candidature dans les délais',
      ok: offer.deadline ? app.applied_at.slice(0, 10) <= offer.deadline : null,
      detail: offer.deadline ? `Date limite : ${formatDate(offer.deadline)} · Dépôt : ${formatDate(app.applied_at)}` : 'Pas de date limite',
    },
    {
      label: 'Profil renseigné',
      ok: Boolean(cand.education_level && cand.field_of_study && skills.length > 0),
      detail: 'Formation, filière et au moins une compétence',
    },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link to="/rh/candidatures" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} /> Retour aux candidatures
      </Link>

      <div className="card flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{cand.profiles.full_name || cand.profiles.email}</h1>
          <p className="text-sm text-muted">{cand.profiles.email}{cand.phone ? ` · ${cand.phone}` : ''}{cand.city ? ` · ${cand.city}` : ''}</p>
          <p className="mt-2 text-sm">
            Candidature pour <span className="font-medium">{offer.title}</span>
            <span className="text-muted"> ({OFFER_TYPE_LABELS[offer.type]}) · déposée le {formatDate(app.applied_at)}</span>
          </p>
        </div>
        <div className="space-y-2">
          <label className="label" htmlFor="status">Statut de la candidature</label>
          <select id="status" className="input min-w-52" value={app.status} disabled={isFinal}
            onChange={(e) => changeStatus(e.target.value as ApplicationStatus)}>
            {(isFinal ? [app.status] : INTERMEDIATE).map((v) => <option key={v} value={v}>{STATUS_LABELS[v]}</option>)}
          </select>
          {app.cv_path && <button onClick={openCv} className="btn-ghost w-full"><FileText size={16} /> Consulter le CV</button>}
        </div>
      </div>

      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Score */}
        <section className="card">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold">Score détaillé</h2>
            <button onClick={recompute} disabled={busy} className="btn-ghost px-3 py-1.5 text-xs">
              <RefreshCw size={14} /> {busy ? 'Calcul…' : 'Recalculer'}
            </button>
          </div>
          {evaluation ? (
            <>
              <p className="mt-3 text-4xl font-semibold text-accent-dark">
                {Math.round(num(evaluation.score_global))}<span className="text-lg font-normal text-muted"> /100</span>
              </p>
              <div className="mt-4 space-y-3">
                {CRITERIA.map((c) => <ScoreBar key={c.key} label={c.label} weight={c.weight} score={num(evaluation[c.key])} />)}
              </div>
              {evaluation.explanation && <p className="mt-4 text-xs text-muted">{evaluation.explanation}</p>}
              <p className="mt-1 text-xs text-muted">Calculé le {formatDateTime(evaluation.evaluated_at)}</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">Aucun score calculé. Cliquez sur « Recalculer ».</p>
          )}
        </section>

        <div className="space-y-5">
          {/* Points forts / à améliorer */}
          {evaluation && (
            <section className="card">
              <h2 className="font-semibold">Points forts</h2>
              {evaluation.strengths.length === 0
                ? <p className="mt-2 text-sm text-muted">Aucun point fort identifié automatiquement.</p>
                : <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{evaluation.strengths.map((s) => <li key={s}>{s}</li>)}</ul>}
              <h2 className="mt-4 font-semibold">À améliorer</h2>
              {evaluation.improvements.length === 0
                ? <p className="mt-2 text-sm text-muted">Rien de particulier à signaler.</p>
                : <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{evaluation.improvements.map((s) => <li key={s}>{s}</li>)}</ul>}
            </section>
          )}

          {/* Éligibilité */}
          <section className="card">
            <h2 className="font-semibold">Conditions d'éligibilité</h2>
            <ul className="mt-3 space-y-2">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2 text-sm">
                  {c.ok === true && <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-accent" />}
                  {c.ok === false && <XCircle size={18} className="mt-0.5 shrink-0 text-danger" />}
                  {c.ok === null && <MinusCircle size={18} className="mt-0.5 shrink-0 text-muted" />}
                  <div>
                    <p className="font-medium">{c.label}</p>
                    <p className="text-xs text-muted">{c.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Information destinée au recruteur : aucune de ces conditions ne rejette automatiquement un candidat.</p>
          </section>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Entretiens */}
        <section className="card">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold">Entretiens</h2>
            {!isFinal && (
              <Link to={`/rh/entretiens/nouveau?application=${app.id}`} className="btn-primary px-3 py-1.5 text-xs">
                Programmer un entretien
              </Link>
            )}
          </div>
          {interviews.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Aucun entretien programmé.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {interviews.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>{formatDateTime(i.scheduled_at)}{i.location ? ` · ${i.location}` : ''}</span>
                  <span className="flex items-center gap-2">
                    <InterviewStatusBadge status={i.status} />
                    <InterviewResultBadge result={i.result} />
                    <Link to={`/rh/entretiens/${i.id}`} className="font-medium text-accent hover:underline">Ouvrir</Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Décision finale */}
        <section className="card">
          <h2 className="font-semibold">Décision finale</h2>
          {decision ? (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <StatusBadge status={decision.decision} />
                <span className="text-xs text-muted">le {formatDateTime(decision.decided_at)}</span>
              </div>
              {decision.note && <p className="whitespace-pre-line text-muted">{decision.note}</p>}
              <p className="text-xs text-muted">Justification interne : le candidat ne voit que le statut.</p>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-muted">
                La décision est prise par le recruteur, en s'appuyant sur le score, le profil et l'entretien.
              </p>
              <textarea rows={3} className="input" placeholder="Justification (interne, facultative)"
                value={note} onChange={(e) => setNote(e.target.value)} aria-label="Justification" />
              <div className="flex flex-wrap gap-3">
                <button disabled={busy} onClick={() => decide('acceptee')} className="btn-primary">Accepter la candidature</button>
                <button disabled={busy} onClick={() => decide('refusee')} className="btn-ghost text-danger">Refuser la candidature</button>
              </div>
            </div>
          )}
          {isFinal && (
            <button disabled={busy} onClick={reopen} className="btn-ghost mt-3">Rouvrir le dossier</button>
          )}
        </section>
      </div>

      {/* Profil */}
      <section className="card space-y-5">
        <h2 className="font-semibold">Profil du candidat</h2>
        <div className="text-sm">
          <p><span className="font-medium">Formation :</span> {cand.education_level ? EDUCATION_LABELS[cand.education_level] : '—'}
            {cand.field_of_study ? ` · ${cand.field_of_study}` : ''}{cand.school ? ` · ${cand.school}` : ''}
            {cand.graduation_year ? ` (${cand.graduation_year})` : ''}</p>
          {cand.summary && <p className="mt-2 whitespace-pre-line text-muted">{cand.summary}</p>}
        </div>

        <div>
          <h3 className="text-sm font-semibold">Compétences techniques</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {skills.length === 0 && <span className="text-sm text-muted">Aucune</span>}
            {skills.map((s) => (
              <span key={s.id} className="rounded-full border border-line bg-beige-50 px-3 py-1 text-sm">
                {s.name} <span className="text-muted">· {SKILL_LEVELS[s.level - 1]}</span>
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Projets</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {projects.length === 0 && <li className="text-muted">Aucun</li>}
            {projects.map((p) => (
              <li key={p.id}>
                <span className="font-medium">{p.title}</span> <span className="text-xs text-muted">({PROJECT_KIND_LABELS[p.kind]})</span>
                {p.description && <p className="text-muted">{p.description}</p>}
                {p.tech_stack.length > 0 && <p className="text-xs text-accent-dark">{p.tech_stack.join(' · ')}</p>}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Langues</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {languages.length === 0 && <span className="text-sm text-muted">Aucune</span>}
            {languages.map((l) => (
              <span key={l.id} className="rounded-full border border-line bg-beige-50 px-3 py-1 text-sm">
                {l.language} <span className="text-muted">· {LANGUAGE_LEVEL_LABELS[l.level]}</span>
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Expériences et certifications</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {experiences.length === 0 && <li className="text-muted">Aucune</li>}
            {experiences.map((x) => (
              <li key={x.id}>
                <span className="font-medium">{x.title}</span> <span className="text-xs text-muted">({EXPERIENCE_KIND_LABELS[x.kind]})</span>
                {x.organization && <span className="text-muted"> · {x.organization}</span>}
                {x.description && <p className="text-muted">{x.description}</p>}
              </li>
            ))}
          </ul>
        </div>

        {app.cover_letter && (
          <div>
            <h3 className="text-sm font-semibold">Message de motivation</h3>
            <p className="mt-2 whitespace-pre-line text-sm text-muted">{app.cover_letter}</p>
          </div>
        )}
      </section>

      {/* Historique */}
      <section className="card">
        <h2 className="font-semibold">Historique de la candidature</h2>
        <ol className="mt-3 space-y-1 border-l border-line pl-4 text-sm">
          {history.map((h) => (
            <li key={h.id}>
              <span className="font-medium">{STATUS_LABELS[h.new_status]}</span>
              <span className="ml-2 text-xs text-muted">{formatDateTime(h.changed_at)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
