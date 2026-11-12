import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/offerTypes'
import type { Interview, InterviewStatus } from '../../lib/interviewTypes'
import { InterviewResultBadge, InterviewStatusBadge } from '../../components/InterviewBadge'

export interface InterviewRow extends Interview {
  applications: {
    id: string
    offers: { title: string } | null
    candidates: { profiles: { full_name: string } | null } | null
  } | null
  interviewer: { full_name: string } | null
}

export const INTERVIEW_SELECT =
  '*, applications(id, offers(title), candidates(profiles(full_name))), interviewer:profiles!interviewer_id(full_name)'

const TABS: { key: InterviewStatus; label: string }[] = [
  { key: 'programme', label: 'À venir' },
  { key: 'realise', label: 'Réalisés' },
  { key: 'annule', label: 'Annulés' },
]

export default function Interviews() {
  const [tab, setTab] = useState<InterviewStatus>('programme')

  const { data, isLoading } = useQuery({
    queryKey: ['rh-interviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interviews').select(INTERVIEW_SELECT).order('scheduled_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as InterviewRow[]
    },
  })

  const all = data ?? []
  const rows = all.filter((i) => i.status === tab)
  if (tab !== 'programme') rows.reverse()

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Entretiens</h1>
          <p className="mt-1 text-sm text-muted">Programmez les entretiens et enregistrez leur évaluation.</p>
        </div>
        <Link to="/rh/entretiens/nouveau" className="btn-primary"><Plus size={16} /> Programmer un entretien</Link>
      </div>

      <div className="mt-5 flex gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={tab === t.key ? 'btn-primary' : 'btn-ghost'}>
            {t.label} ({all.filter((i) => i.status === t.key).length})
          </button>
        ))}
      </div>

      <div className="card mt-5 overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-beige-50 text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Candidat</th>
              <th className="px-4 py-3">Offre</th>
              <th className="px-4 py-3">Recruteur</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Résultat</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted">Chargement…</td></tr>}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted">Aucun entretien dans cette catégorie.</td></tr>
            )}
            {rows.map((i) => (
              <tr key={i.id} className="border-b border-line last:border-0 hover:bg-beige-50">
                <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(i.scheduled_at)}</td>
                <td className="px-4 py-3 font-medium">{i.applications?.candidates?.profiles?.full_name || '—'}</td>
                <td className="px-4 py-3">{i.applications?.offers?.title ?? '—'}</td>
                <td className="px-4 py-3">{i.interviewer?.full_name || '—'}</td>
                <td className="px-4 py-3"><InterviewStatusBadge status={i.status} /></td>
                <td className="px-4 py-3"><InterviewResultBadge result={i.result} /></td>
                <td className="px-4 py-3">
                  <Link to={`/rh/entretiens/${i.id}`} className="font-medium text-accent hover:underline">Ouvrir</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
