import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, MapPin } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { OFFER_TYPE_LABELS, formatDate, todayIso, type Offer, type OfferType } from '../../lib/offerTypes'

export default function CandidatOffers() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState<OfferType | ''>('')

  const offersQ = useQuery({
    queryKey: ['open-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers').select('*')
        .eq('status', 'publiee')
        .or(`deadline.is.null,deadline.gte.${todayIso()}`)
        .order('published_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Offer[]
    },
  })

  const appliedQ = useQuery({
    queryKey: ['applied-ids'],
    queryFn: async () => {
      const { data, error } = await supabase.from('applications').select('offer_id')
      if (error) throw error
      return (data ?? []).map((a) => a.offer_id as string)
    },
  })

  const offers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (offersQ.data ?? []).filter((o) =>
      (!type || o.type === type) &&
      (!q || [o.title, o.department, o.location].some((x) => x?.toLowerCase().includes(q))))
  }, [offersQ.data, search, type])

  return (
    <div>
      <h1 className="text-2xl font-semibold">Offres disponibles</h1>
      <p className="mt-1 text-sm text-muted">Consultez les offres ouvertes et postulez en quelques clics.</p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input className="input sm:max-w-sm" placeholder="Rechercher (poste, service, lieu)…" value={search}
          onChange={(e) => setSearch(e.target.value)} aria-label="Rechercher" />
        <select className="input sm:w-48" value={type} onChange={(e) => setType(e.target.value as OfferType | '')} aria-label="Type">
          <option value="">Tous les types</option>
          {Object.entries(OFFER_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {offersQ.isLoading && <p className="text-sm text-muted">Chargement…</p>}
        {!offersQ.isLoading && offers.length === 0 && (
          <div className="card text-sm text-muted md:col-span-2">Aucune offre ouverte pour le moment.</div>
        )}
        {offers.map((o) => {
          const applied = appliedQ.data?.includes(o.id)
          return (
            <Link key={o.id} to={`/candidat/offres/${o.id}`} className="card block transition-colors hover:border-accent">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{o.title}</h2>
                {applied && <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-dark">Déjà postulé</span>}
              </div>
              <p className="mt-1 text-sm text-muted">{[OFFER_TYPE_LABELS[o.type], o.department].filter(Boolean).join(' · ')}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                {o.location && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {o.location}</span>}
                {o.deadline && <span className="inline-flex items-center gap-1"><CalendarClock size={13} /> Avant le {formatDate(o.deadline)}</span>}
              </div>
              {o.required_skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {o.required_skills.slice(0, 5).map((s) => (
                    <span key={s} className="rounded-full bg-beige-100 px-2 py-0.5 text-xs text-ink">{s}</span>
                  ))}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
