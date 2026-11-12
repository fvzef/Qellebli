import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { STATUS_LABELS, type ApplicationStatus } from '../../lib/constants'
import { daysSince, type PipelineCard } from '../../lib/pipeline'
import { one } from '../../lib/rhTypes'
import PipelineBoard from '../../components/pipeline/PipelineBoard'

interface Row {
  id: string
  status: ApplicationStatus
  applied_at: string
  updated_at: string
  offer_id: string
  offers: { title: string } | null
  candidates: { profiles: { full_name: string } | null } | null
  evaluations: { score_global: number } | { score_global: number }[] | null
}

type Decision = { card: PipelineCard; to: 'acceptee' | 'refusee' }

export default function Pipeline() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [offerId, setOfferId] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [decision, setDecision] = useState<Decision | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const key = ['rh-pipeline']
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('id, status, applied_at, updated_at, offer_id, offers(title), candidates(profiles(full_name)), evaluations(score_global)')
        .order('applied_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as Row[]
    },
  })

  const rows = data ?? []
  const offers = useMemo(() => [...new Map(rows.map((r) => [r.offer_id, r.offers?.title ?? 'Offre'])).entries()], [rows])

  const cards: PipelineCard[] = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows
      .filter((r) => (!offerId || r.offer_id === offerId) &&
        (!q || (r.candidates?.profiles?.full_name ?? '').toLowerCase().includes(q)))
      .map((r) => {
        const e = one(r.evaluations)
        return {
          id: r.id, status: r.status, name: r.candidates?.profiles?.full_name ?? '',
          offerTitle: r.offers?.title ?? 'Offre', score: e ? Number(e.score_global) : null,
          daysInStage: daysSince(r.updated_at),
        }
      })
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  }, [rows, offerId, search])

  const refreshAll = () => Promise.all(['rh-pipeline', 'rh-applications', 'rh-app', 'dashboard', 'rh-pending']
    .map((k) => qc.invalidateQueries({ queryKey: [k] })))

  const onMove = async (card: PipelineCard, to: ApplicationStatus) => {
    setError(null); setInfo(null)
    if (to === 'acceptee' || to === 'refusee') { setNote(''); setDecision({ card, to }); return }
    if (to === 'entretien_programme') {
      // Le statut passe automatiquement à « Entretien programmé » quand l'entretien est enregistré
      navigate(`/rh/entretiens/nouveau?application=${card.id}`)
      return
    }
    // Déplacement immédiat à l'écran, puis enregistrement
    const now = new Date().toISOString()
    qc.setQueryData<Row[]>(key, (old) => (old ?? []).map((r) => (r.id === card.id ? { ...r, status: to, updated_at: now } : r)))
    const { error } = await supabase.from('applications').update({ status: to }).eq('id', card.id)
    if (error) setError(`Déplacement impossible : ${error.message}`)
    else setInfo(`${card.name || 'Candidature'} déplacé(e) vers « ${STATUS_LABELS[to]} ».`)
    await refreshAll()
  }

  const confirmDecision = async () => {
    if (!decision || !session) return
    setBusy(true); setError(null)
    const { card, to } = decision
    const up = await supabase.from('applications').update({ status: to }).eq('id', card.id)
    if (up.error) { setError(up.error.message); setBusy(false); return }
    const dec = await supabase.from('decisions').upsert({
      application_id: card.id, decision: to, note: note.trim() || null,
      decided_by: session.user.id, decided_at: new Date().toISOString(),
    }, { onConflict: 'application_id' })
    if (dec.error) setError(dec.error.message)
    else setInfo(`Décision enregistrée : ${card.name || 'candidature'} → ${STATUS_LABELS[to]}.`)
    setDecision(null); setBusy(false)
    await refreshAll()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pipeline de recrutement</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Glissez une carte d'une colonne à l'autre pour changer son statut (ou utilisez « Déplacer… »).
            L'entretien, l'acceptation et le refus passent par une étape de confirmation : la décision reste humaine.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <input className="input sm:w-48" placeholder="Rechercher un candidat…" value={search}
            onChange={(e) => setSearch(e.target.value)} aria-label="Rechercher" />
          <select className="input sm:w-56" value={offerId} onChange={(e) => setOfferId(e.target.value)} aria-label="Offre">
            <option value="">Toutes les offres</option>
            {offers.map(([id, t]) => <option key={id} value={id}>{t}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      {info && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-dark">{info}</p>}

      {isLoading ? <p className="text-sm text-muted">Chargement…</p>
        : cards.length === 0 && rows.length === 0
          ? <div className="card text-sm text-muted">Aucune candidature pour le moment.</div>
          : <PipelineBoard cards={cards} onMove={onMove} showOffer={!offerId} />}

      {decision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true">
          <div className="card w-full max-w-md space-y-3">
            <h2 className="text-lg font-semibold">
              {decision.to === 'acceptee' ? 'Accepter' : 'Refuser'} la candidature de {decision.card.name || 'ce candidat'} ?
            </h2>
            <p className="text-sm text-muted">Le candidat verra le nouveau statut. La justification ci-dessous reste interne.</p>
            <textarea rows={3} className="input" placeholder="Justification (interne, facultative)" value={note}
              onChange={(e) => setNote(e.target.value)} aria-label="Justification" />
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" disabled={busy} onClick={() => setDecision(null)}>Annuler</button>
              <button className={decision.to === 'acceptee' ? 'btn-primary' : 'btn-ghost text-danger'} disabled={busy}
                onClick={confirmDecision}>
                {busy ? 'Enregistrement…' : decision.to === 'acceptee' ? 'Confirmer l\'acceptation' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
