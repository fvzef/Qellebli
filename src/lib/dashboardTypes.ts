import type { ApplicationStatus } from './constants'

export interface DashboardData {
  total: number
  in_progress: number
  preselected: number
  interviews_scheduled: number
  interviewed: number
  hires: number
  rejected: number
  hires_interviewed: number
  avg_duration_days: number | null
  avg_initial_hours: number | null
  avg_days_to_interview: number | null
  backlog_7d: number
  avg_score: number | null
  open_offers: number
  by_status: { status: ApplicationStatus; count: number }[]
  per_month: { month: string; count: number }[]
  by_offer: { offer_id: string; title: string; applications: number; preselected: number; hires: number }[]
  score_buckets: { bucket: string; count: number }[]
}

/** Pourcentage à 1 décimale, ou null si le dénominateur est nul. */
export const pct = (n: number, d: number): number | null =>
  d > 0 ? Math.round((n / d) * 1000) / 10 : null

export const fmtPct = (v: number | null): string => (v === null ? '—' : `${v.toLocaleString('fr-FR')} %`)
export const fmtDays = (v: number | null): string => (v === null ? '—' : `${v.toLocaleString('fr-FR')} j`)
export const fmtHours = (h: number | null): string =>
  h === null ? '—' : h >= 48 ? `${(h / 24).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} j` : `${h.toLocaleString('fr-FR')} h`

export const monthLabel = (ym: string): string =>
  new Date(`${ym}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
