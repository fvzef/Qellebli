import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useDashboard, useDashboardOffers } from '../../hooks/useDashboard'
import { formatDate, formatDateTime } from '../../lib/offerTypes'
import { KpiGrid } from '../../components/dashboard/Kpis'
import { ChartCard, FunnelChart, MonthlyChart, StatusDonut } from '../../components/dashboard/Charts'
import { INTERVIEW_SELECT, type InterviewRow } from './Interviews'

interface PendingRow {
  id: string
  applied_at: string
  offers: { title: string } | null
  candidates: { profiles: { full_name: string } | null } | null
}

export default function RhHome() {
  const { profile } = useAuth()
  const [offerId, setOfferId] = useState('')
  const dash = useDashboard(offerId)
  const offers = useDashboardOffers()

  const pendingQ = useQuery({
    queryKey: ['rh-pending', offerId],
    queryFn: async () => {
      let q = supabase.from('applications')
        .select('id, applied_at, offers(title), candidates(profiles(full_name))')
        .eq('status', 'recue').order('applied_at', { ascending: true }).limit(5)
      if (offerId) q = q.eq('offer_id', offerId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as unknown as PendingRow[]
    },
  })

  const upcomingQ = useQuery({
    queryKey: ['rh-upcoming-interviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interviews').select(INTERVIEW_SELECT)
        .eq('status', 'programme').gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true }).limit(5)
      if (error) throw error
      return (data ?? []) as unknown as InterviewRow[]
    },
  })

  const d = dash.data

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Bonjour {profile?.full_name || ''}</h1>
          <p className="mt-1 text-sm text-muted">Tableau de bord du recrutement, calculé à partir des données réelles.</p>
        </div>
        <select className="input w-full sm:w-64" value={offerId} onChange={(e) => setOfferId(e.target.value)} aria-label="Offre">
          <option value="">Toutes les offres</option>
          {(offers.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
        </select>
      </div>

      {dash.isLoading && <p className="text-sm text-muted">Chargement des indicateurs…</p>}
      {dash.error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          Impossible de charger les indicateurs. Vérifiez que le script SQL 005 a été exécuté.
        </p>
      )}

      {d && (
        <>
          <KpiGrid d={d} />

          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Entonnoir de recrutement" hint="De la candidature à l'acceptation">
              <FunnelChart d={d} />
            </ChartCard>
            <ChartCard title="Répartition par statut" hint="Situation actuelle des candidatures">
              <StatusDonut d={d} />
            </ChartCard>
          </div>

          <ChartCard title="Candidatures reçues par mois" hint="6 derniers mois">
            <MonthlyChart d={d} />
          </ChartCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="card">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">À traiter</h2>
                <Link to="/rh/candidatures" className="text-sm font-medium text-accent hover:underline">Tout voir</Link>
              </div>
              <p className="text-xs text-muted">Candidatures reçues, les plus anciennes d'abord</p>
              <ul className="mt-3 divide-y divide-line">
                {(pendingQ.data ?? []).length === 0 && <li className="py-3 text-sm text-muted">Rien en attente.</li>}
                {(pendingQ.data ?? []).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span>
                      <span className="font-medium">{a.candidates?.profiles?.full_name || '—'}</span>
                      <span className="text-muted"> · {a.offers?.title} · {formatDate(a.applied_at)}</span>
                    </span>
                    <Link to={`/rh/candidatures/${a.id}`} className="font-medium text-accent hover:underline">Voir</Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Prochains entretiens</h2>
                <Link to="/rh/entretiens" className="text-sm font-medium text-accent hover:underline">Tout voir</Link>
              </div>
              <p className="text-xs text-muted">Les 5 prochains rendez-vous</p>
              <ul className="mt-3 divide-y divide-line">
                {(upcomingQ.data ?? []).length === 0 && <li className="py-3 text-sm text-muted">Aucun entretien à venir.</li>}
                {(upcomingQ.data ?? []).map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span>
                      <span className="font-medium">{i.applications?.candidates?.profiles?.full_name || '—'}</span>
                      <span className="text-muted"> · {formatDateTime(i.scheduled_at)}</span>
                    </span>
                    <Link to={`/rh/entretiens/${i.id}`} className="font-medium text-accent hover:underline">Ouvrir</Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
