import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useCandidate } from '../../hooks/useCandidate'
import { useList } from '../../hooks/useList'
import { useMyApplications, useMyInterviews } from '../../hooks/useMyApplications'
import type { Experience, LanguageRow, Project, Skill } from '../../lib/profileTypes'
import { formatDate, formatDateTime, todayIso } from '../../lib/offerTypes'
import StatusBadge from '../../components/StatusBadge'

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-accent-dark">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export default function CandidatHome() {
  const { profile } = useAuth()
  const { data: c } = useCandidate()
  const skills = useList<Skill>('candidate_skills', c?.id)
  const projects = useList<Project>('candidate_projects', c?.id)
  const languages = useList<LanguageRow>('candidate_languages', c?.id)
  const experiences = useList<Experience>('candidate_experiences', c?.id)
  const appsQ = useMyApplications()
  const interviewsQ = useMyInterviews()

  const openOffersQ = useQuery({
    queryKey: ['open-offers-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('offers').select('id', { count: 'exact', head: true })
        .eq('status', 'publiee').or(`deadline.is.null,deadline.gte.${todayIso()}`)
      if (error) throw error
      return count ?? 0
    },
  })

  const checks = [
    Boolean(c?.phone && c?.city),
    Boolean(c?.education_level && c?.school && c?.field_of_study),
    Boolean(c?.summary),
    Boolean(c?.cv_path),
    skills.items.length > 0,
    projects.items.length > 0,
    languages.items.length > 0,
    experiences.items.length > 0,
  ]
  const pct = c ? Math.round((checks.filter(Boolean).length / checks.length) * 100) : 0

  const apps = appsQ.data ?? []
  const inProgress = apps.filter((a) => a.status !== 'acceptee' && a.status !== 'refusee').length
  const nextInterview = (interviewsQ.data ?? []).find((i) => new Date(i.scheduled_at) >= new Date())
  const nextInterviewApp = nextInterview ? apps.find((a) => a.id === nextInterview.application_id) : undefined

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bonjour {profile?.full_name || ''}</h1>
        <p className="mt-1 text-sm text-muted">Voici un aperçu de votre parcours sur QELLEBLI.</p>
      </div>

      {nextInterview && (
        <div className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4 text-accent-dark">
          <CalendarClock size={20} className="mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Prochain entretien : {formatDateTime(nextInterview.scheduled_at)}</p>
            <p>
              {nextInterviewApp?.offers?.title}
              {nextInterview.location && <> · {nextInterview.location}</>}
              {nextInterview.interviewer_name && <> · avec {nextInterview.interviewer_name}</>}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Profil complété" value={`${pct} %`} />
        <Stat label="Candidatures déposées" value={apps.length} />
        <Stat label="En cours" value={inProgress} hint="Hors décisions finales" />
        <Stat label="Offres ouvertes" value={openOffersQ.data ?? '—'} />
      </div>

      {pct < 100 && (
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">Un profil complet aide les recruteurs à mieux évaluer votre candidature.</p>
          <Link to="/candidat/profil" className="btn-primary">Compléter mon profil</Link>
        </div>
      )}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Dernières candidatures</h2>
          <Link to="/candidat/candidatures" className="text-sm font-medium text-accent hover:underline">Tout voir</Link>
        </div>
        <div className="mt-3 space-y-2">
          {apps.length === 0 && (
            <div className="card text-sm text-muted">
              Aucune candidature pour le moment.{' '}
              <Link to="/candidat/offres" className="font-medium text-accent hover:underline">Découvrir les offres</Link>
            </div>
          )}
          {apps.slice(0, 3).map((a) => (
            <div key={a.id} className="card flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-medium">{a.offers?.title ?? 'Offre'}</p>
                <p className="text-xs text-muted">Déposée le {formatDate(a.applied_at)}</p>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
