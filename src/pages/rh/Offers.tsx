import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { OFFER_TYPE_LABELS, formatDate, type Offer, type OfferStatus } from '../../lib/offerTypes'
import { OfferStatusBadge } from '../../components/StatusBadge'

type Row = Offer & { applications: { count: number }[] }

export default function RhOffers() {
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['rh-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers').select('*, applications(count)').order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Row[]
    },
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['rh-offers'] })

  const setStatus = async (o: Row, status: OfferStatus) => {
    setError(null)
    const now = new Date().toISOString()
    const { error } = await supabase.from('offers').update({
      status,
      published_at: status === 'publiee' ? (o.published_at ?? now) : o.published_at,
      closed_at: status === 'cloturee' ? now : null,
    }).eq('id', o.id)
    if (error) setError(error.message)
    else await refresh()
  }

  const remove = async (o: Row) => {
    if (!window.confirm(`Supprimer l'offre « ${o.title} » ?`)) return
    setError(null)
    const { error } = await supabase.from('offers').delete().eq('id', o.id)
    if (error) {
      setError(error.code === '23503'
        ? "Impossible de supprimer : des candidatures existent pour cette offre. Clôturez-la à la place."
        : error.message)
    } else await refresh()
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des offres</h1>
          <p className="mt-1 text-sm text-muted">Créez, publiez et clôturez vos offres de recrutement.</p>
        </div>
        <Link to="/rh/offres/nouvelle" className="btn-primary"><Plus size={16} /> Nouvelle offre</Link>
      </div>

      {error && <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted">Chargement…</p>}
        {!isLoading && data?.length === 0 && (
          <div className="card text-sm text-muted">Aucune offre pour le moment. Cliquez sur « Nouvelle offre ».</div>
        )}
        {data?.map((o) => (
          <div key={o.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{o.title}</h2>
                  <OfferStatusBadge status={o.status} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {[OFFER_TYPE_LABELS[o.type], o.department, o.location].filter(Boolean).join(' · ')}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Date limite : {formatDate(o.deadline)} · Candidatures : {o.applications[0]?.count ?? 0}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {o.status === 'brouillon' && <button className="btn-primary" onClick={() => setStatus(o, 'publiee')}>Publier</button>}
                {o.status === 'publiee' && <button className="btn-ghost" onClick={() => setStatus(o, 'cloturee')}>Clôturer</button>}
                {o.status === 'cloturee' && <button className="btn-ghost" onClick={() => setStatus(o, 'publiee')}>Rouvrir</button>}
                <Link to={`/rh/offres/${o.id}`} className="btn-ghost" aria-label="Modifier"><Pencil size={16} /></Link>
                <button className="btn-ghost text-danger" onClick={() => remove(o)} aria-label="Supprimer"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
