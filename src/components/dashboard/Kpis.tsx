import type { ReactNode } from 'react'
import { fmtDays, fmtHours, fmtPct, pct, type DashboardData } from '../../lib/dashboardTypes'

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-accent-dark">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

/** Les 8 indicateurs demandés dans le cahier des charges. */
export function KpiGrid({ d }: { d: DashboardData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Candidatures totales" value={d.total} />
      <StatCard label="Candidatures en cours" value={d.in_progress} hint="Hors acceptées et refusées" />
      <StatCard label="Candidats présélectionnés" value={d.preselected} hint="Présélectionnés au moins une fois" />
      <StatCard label="Entretiens programmés" value={d.interviews_scheduled} hint="À venir, dossiers non décidés" />
      <StatCard label="Recrutements effectués" value={d.hires} hint={`${d.rejected} candidature(s) refusée(s)`} />
      <StatCard label="Taux de présélection" value={fmtPct(pct(d.preselected, d.total))} hint="Présélectionnés ÷ candidatures" />
      <StatCard label="Conversion entretien → recrutement" value={fmtPct(pct(d.hires_interviewed, d.interviewed))}
        hint={`${d.hires_interviewed} recrutement(s) sur ${d.interviewed} entretien(s)`} />
      <StatCard label="Durée moyenne du processus" value={fmtDays(d.avg_duration_days)} hint="Dépôt → décision finale" />
    </div>
  )
}

/** Indicateurs de pilotage pour la Direction. */
export function PerformanceGrid({ d }: { d: DashboardData }) {
  const decided = d.hires + d.rejected
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Délai de traitement initial" value={fmtHours(d.avg_initial_hours)} hint="Dépôt → première action RH" />
      <StatCard label="Délai avant entretien" value={fmtDays(d.avg_days_to_interview)} hint="Dépôt → premier entretien" />
      <StatCard label="Taux d'acceptation" value={fmtPct(pct(d.hires, decided))} hint="Acceptées ÷ décisions finales" />
      <StatCard label="Dossiers en attente > 7 jours" value={d.backlog_7d} hint="Toujours au statut « Reçue »" />
    </div>
  )
}
