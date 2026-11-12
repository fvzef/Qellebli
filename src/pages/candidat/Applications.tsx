import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatDate, formatDateTime } from '../../lib/offerTypes'
import { STATUS_LABELS, type ApplicationStatus } from '../../lib/constants'
import { useMyApplications, useMyInterviews } from '../../hooks/useMyApplications'
import StatusBadge from '../../components/StatusBadge'

interface HistoryRow {
  id: string
  application_id: string
  new_status: ApplicationStatus
  changed_at: string
}

export default function Applications() {
  const appsQ = useMyApplications()
  const interviewsQ = useMyInterviews()

  const histQ = useQuery({
    queryKey: ['my-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('application_status_history')
        .select('id, application_id, new_status, changed_at')
        .order('changed_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as HistoryRow[]
    },
  })

  const apps = appsQ.data ?? []

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Mes candidatures</h1>
      <p className="mt-1 text-sm text-muted">Suivez l'évolution de chacune de vos candidatures.</p>

      <div className="mt-6 space-y-3">
        {appsQ.isLoading && <p className="text-sm text-muted">Chargement…</p>}
        {!appsQ.isLoading && apps.length === 0 && (
          <div className="card text-sm text-muted">
            Vous n'avez pas encore postulé.{' '}
            <Link to="/candidat/offres" className="font-medium text-accent hover:underline">Voir les offres</Link>
          </div>
        )}
        {apps.map((a) => {
          const history = (histQ.data ?? []).filter((h) => h.application_id === a.id)
          const interviews = (interviewsQ.data ?? []).filter((i) => i.application_id === a.id)
          return (
            <div key={a.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{a.offers?.title ?? 'Offre'}</h2>
                  <p className="mt-0.5 text-sm text-muted">
                    {[a.offers?.department, a.offers?.location].filter(Boolean).join(' · ')}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">Candidature du {formatDate(a.applied_at)}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>

              {interviews.map((i) => (
                <div key={i.scheduled_at} className="mt-3 flex items-start gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-dark">
                  <CalendarClock size={16} className="mt-0.5 shrink-0" />
                  <span>
                    Entretien le <strong>{formatDateTime(i.scheduled_at)}</strong>
                    {i.location && <> · {i.location}</>}
                    {i.interviewer_name && <> · avec {i.interviewer_name}</>}
                  </span>
                </div>
              ))}

              {history.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-accent">Historique</summary>
                  <ol className="mt-2 space-y-1 border-l border-line pl-4 text-sm">
                    {history.map((h) => (
                      <li key={h.id}>
                        <span className="font-medium">{STATUS_LABELS[h.new_status]}</span>
                        <span className="ml-2 text-xs text-muted">{formatDateTime(h.changed_at)}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
