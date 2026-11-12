import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useCandidate } from '../../hooks/useCandidate'
import { EDUCATION_LABELS } from '../../lib/profileTypes'
import { OFFER_TYPE_LABELS, formatDate, isOpen, type Offer } from '../../lib/offerTypes'
import type { ApplicationStatus } from '../../lib/constants'
import StatusBadge from '../../components/StatusBadge'

export default function OfferDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: candidate } = useCandidate()
  const [cover, setCover] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const offerQ = useQuery({
    queryKey: ['offer', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('offers').select('*').eq('id', id!).single()
      if (error) throw error
      return data as Offer
    },
  })

  const appliedQ = useQuery({
    queryKey: ['applied', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications').select('id, status').eq('offer_id', id!).maybeSingle()
      if (error) throw error
      return data as { id: string; status: ApplicationStatus } | null
    },
  })

  if (offerQ.isLoading) return <p className="text-sm text-muted">Chargement…</p>
  const offer = offerQ.data
  if (!offer) return <p className="text-sm text-danger">Offre introuvable ou fermée.</p>

  const applied = appliedQ.data
  const open = isOpen(offer)
  const hasCv = Boolean(candidate?.cv_path)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!candidate) return
    setBusy(true); setError(null)
    const { error } = await supabase.from('applications').insert({
      candidate_id: candidate.id,
      offer_id: offer.id,
      cover_letter: cover.trim() || null,
      cv_path: candidate.cv_path,
    })
    if (error) {
      if (error.code === '23505') setError('Vous avez déjà postulé à cette offre.')
      else if (error.code === '42501') setError("Cette offre n'accepte plus de candidatures.")
      else setError(error.message)
      setBusy(false)
      return
    }
    await Promise.all(['applied', 'applied-ids', 'my-applications', 'my-history']
      .map((k) => qc.invalidateQueries({ queryKey: [k] })))
    navigate('/candidat/candidatures')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/candidat/offres" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} /> Retour aux offres
      </Link>

      <div className="card">
        <h1 className="text-2xl font-semibold">{offer.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {[OFFER_TYPE_LABELS[offer.type], offer.department, offer.location].filter(Boolean).join(' · ')}
        </p>
        {offer.deadline && <p className="mt-1 text-xs text-muted">Date limite : {formatDate(offer.deadline)}</p>}

        <h2 className="mt-5 text-sm font-semibold">Description</h2>
        <p className="mt-1 whitespace-pre-line text-sm text-ink">{offer.description}</p>

        {(offer.min_education || offer.target_field || offer.required_skills.length > 0 || offer.required_languages.length > 0) && (
          <>
            <h2 className="mt-5 text-sm font-semibold">Profil recherché</h2>
            <ul className="mt-1 space-y-1 text-sm text-ink">
              {offer.min_education && <li>Niveau minimum : {EDUCATION_LABELS[offer.min_education]}</li>}
              {offer.target_field && <li>Filière : {offer.target_field}</li>}
              {offer.required_skills.length > 0 && <li>Compétences : {offer.required_skills.join(', ')}</li>}
              {offer.required_languages.length > 0 && <li>Langues : {offer.required_languages.join(', ')}</li>}
            </ul>
          </>
        )}
      </div>

      <div className="card mt-5">
        {applied ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>Vous avez déjà postulé à cette offre.</span>
            <StatusBadge status={applied.status} />
            <Link to="/candidat/candidatures" className="font-medium text-accent hover:underline">Suivre ma candidature</Link>
          </div>
        ) : !open ? (
          <p className="text-sm text-muted">Cette offre n'accepte plus de candidatures.</p>
        ) : !hasCv ? (
          <p className="text-sm">
            Ajoutez votre CV avant de postuler.{' '}
            <Link to="/candidat/profil" className="font-medium text-accent hover:underline">Compléter mon profil</Link>
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <h2 className="font-semibold">Postuler</h2>
            <p className="text-sm text-muted">Votre profil et votre CV seront transmis au recruteur.</p>
            <div>
              <label className="label" htmlFor="cover">Message de motivation (facultatif)</label>
              <textarea id="cover" rows={5} className="input" value={cover} onChange={(e) => setCover(e.target.value)} />
            </div>
            {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Envoi…' : 'Envoyer ma candidature'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
