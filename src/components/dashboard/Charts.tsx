import type { ReactNode } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { STATUS_LABELS, type ApplicationStatus } from '../../lib/constants'
import { monthLabel, type DashboardData } from '../../lib/dashboardTypes'

const GRID = '#E7E2D8'
const TICK = { fontSize: 12, fill: '#76736B' }

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  recue: '#D9CDB8',
  en_verification: '#C4B79F',
  en_evaluation: '#9DB3A8',
  preselectionnee: '#6F8A7D',
  entretien_programme: '#4A6358',
  acceptee: '#2F4A3F',
  refusee: '#B5776C',
}
const FUNNEL_COLORS = ['#D9CDB8', '#9DB3A8', '#6F8A7D', '#2F4A3F']

export function ChartCard({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

const Empty = () => <p className="py-10 text-center text-sm text-muted">Pas encore de données.</p>

/** Entonnoir : candidatures → présélectionnées → entretiens → acceptées. */
export function FunnelChart({ d }: { d: DashboardData }) {
  if (d.total === 0) return <Empty />
  const data = [
    { name: 'Candidatures', value: d.total },
    { name: 'Présélectionnées', value: d.preselected },
    { name: 'Entretiens', value: d.interviewed },
    { name: 'Acceptées', value: d.hires },
  ]
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" allowDecimals={false} tick={TICK} />
        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: '#2B2B28' }} />
        <Tooltip cursor={{ fill: '#F5F0E8' }} />
        <Bar dataKey="value" name="Candidatures" radius={[0, 6, 6, 0]}>
          {data.map((_, i) => <Cell key={i} fill={FUNNEL_COLORS[i]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Répartition actuelle des candidatures par statut. */
export function StatusDonut({ d }: { d: DashboardData }) {
  const data = d.by_status
    .filter((s) => s.count > 0)
    .map((s) => ({ label: STATUS_LABELS[s.status], count: s.count, color: STATUS_COLORS[s.status] }))
  if (data.length === 0) return <Empty />
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((s) => <Cell key={s.label} fill={s.color} />)}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

/** Candidatures reçues sur les 6 derniers mois. */
export function MonthlyChart({ d }: { d: DashboardData }) {
  if (d.total === 0) return <Empty />
  const data = d.per_month.map((m) => ({ name: monthLabel(m.month), count: m.count }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: -16, right: 8 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="name" tick={TICK} />
        <YAxis allowDecimals={false} tick={TICK} />
        <Tooltip cursor={{ fill: '#F5F0E8' }} />
        <Bar dataKey="count" name="Candidatures" fill="#4A6358" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Candidatures, présélections et recrutements par offre. */
export function OfferChart({ d }: { d: DashboardData }) {
  if (d.by_offer.length === 0) return <Empty />
  const data = d.by_offer.map((o) => ({
    name: o.title.length > 22 ? `${o.title.slice(0, 21)}…` : o.title,
    Candidatures: o.applications, Présélectionnées: o.preselected, Recrutements: o.hires,
  }))
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 70)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" allowDecimals={false} tick={TICK} />
        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: '#2B2B28' }} />
        <Tooltip cursor={{ fill: '#F5F0E8' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Candidatures" fill="#D9CDB8" radius={[0, 4, 4, 0]} />
        <Bar dataKey="Présélectionnées" fill="#6F8A7D" radius={[0, 4, 4, 0]} />
        <Bar dataKey="Recrutements" fill="#2F4A3F" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Distribution des scores globaux. */
export function ScoreChart({ d }: { d: DashboardData }) {
  if (d.score_buckets.every((b) => b.count === 0)) return <Empty />
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={d.score_buckets} margin={{ left: -16, right: 8 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="bucket" tick={TICK} />
        <YAxis allowDecimals={false} tick={TICK} />
        <Tooltip cursor={{ fill: '#F5F0E8' }} />
        <Bar dataKey="count" name="Candidats" fill="#6F8A7D" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
