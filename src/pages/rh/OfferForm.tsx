import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { EDUCATION_LABELS, type EducationLevel } from '../../lib/profileTypes'
import TagInput from '../../components/TagInput'
import {
  OFFER_STATUS_LABELS, OFFER_TYPE_LABELS, type Offer, type OfferStatus, type OfferType,
} from '../../lib/offerTypes'

export default function OfferForm() {
  const { id } = useParams()
  const editing = Boolean(id)

  const { data: existing, isLoading } = useQuery({
    queryKey: ['offer', id],
    enabled: editing,
    queryFn: async () => {
      const { data, error } = await supabase.from('offers').select('*').eq('id', id!).single()
      if (error) throw error
      return data as Offer
    },
  })

  if (editing && isLoading) return <p className="text-sm text-muted">Chargement…</p>
  if (editing && !existing) return <p className="text-sm text-danger">Offre introuvable.</p>
  return <OfferFormInner existing={existing ?? null} />
}

function OfferFormInner({ existing }: { existing: Offer | null }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { session } = useAuth()

  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [department, setDepartment] = useState(existing?.department ?? '')
  const [location, setLocation] = useState(existing?.location ?? '')
  const [type, setType] = useState<OfferType>(existing?.type ?? 'stage')
  const [minEducation, setMinEducation] = useState<EducationLevel | ''>(existing?.min_education ?? '')
  const [targetField, setTargetField] = useState(existing?.target_field ?? '')
  const [skills, setSkills] = useState<string[]>(existing?.required_skills ?? [])
  const [languages, setLanguages] = useState<string[]>(existing?.required_languages ?? [])
  const [deadline, setDeadline] = useState(existing?.deadline ?? '')
  const [status, setStatus] = useState<OfferStatus>(existing?.status ?? 'brouillon')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!session) return
    setBusy(true); setError(null)
    const now = new Date().toISOString()
    const payload = {
      title: title.trim(),
      description: description.trim(),
      department: department.trim() || null,
      location: location.trim() || null,
      type,
      min_education: minEducation || null,
      target_field: targetField.trim() || null,
      required_skills: skills,
      required_languages: languages,
      deadline: deadline || null,
      status,
      published_at: status === 'publiee' ? (existing?.published_at ?? now) : (existing?.published_at ?? null),
      closed_at: status === 'cloturee' ? (existing?.closed_at ?? now) : null,
    }
    const { error } = existing
      ? await supabase.from('offers').update(payload).eq('id', existing.id)
      : await supabase.from('offers').insert({ ...payload, created_by: session.user.id })
    if (error) { setError(error.message); setBusy(false); return }
    await qc.invalidateQueries({ queryKey: ['rh-offers'] })
    await qc.invalidateQueries({ queryKey: ['offer'] })
    navigate('/rh/offres')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/rh/offres" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} /> Retour aux offres
      </Link>
      <h1 className="text-2xl font-semibold">{existing ? "Modifier l'offre" : 'Nouvelle offre'}</h1>

      <form onSubmit={onSubmit} className="card mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="title">Intitulé du poste *</label>
          <input id="title" required className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="desc">Description *</label>
          <textarea id="desc" required rows={6} className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="dept">Service / département</label>
          <input id="dept" list="dl-departments" autoComplete="off" className="input" value={department} onChange={(e) => setDepartment(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="loc">Lieu</label>
          <input id="loc" list="dl-locations" autoComplete="off" className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="type">Type de contrat</label>
          <select id="type" className="input" value={type} onChange={(e) => setType(e.target.value as OfferType)}>
            {Object.entries(OFFER_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="deadline">Date limite de candidature</label>
          <input id="deadline" type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="edu">Niveau d'études minimum</label>
          <select id="edu" className="input" value={minEducation} onChange={(e) => setMinEducation(e.target.value as EducationLevel | '')}>
            <option value="">Aucun</option>
            {Object.entries(EDUCATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="field">Filière visée</label>
          <input id="field" list="dl-fields" autoComplete="off" className="input" value={targetField} onChange={(e) => setTargetField(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="skills">Compétences requises</label>
          <TagInput id="skills" value={skills} onChange={setSkills} listId="dl-skills" placeholder="Tapez puis Entrée : Excel, SQL, Power BI…" />
          <p className="mt-1 text-xs text-muted">Choisissez dans les suggestions : des intitulés identiques à ceux des profils donnent un score plus fiable.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="langs">Langues requises</label>
          <TagInput id="langs" value={languages} onChange={setLanguages} listId="dl-languages" placeholder="Tapez puis Entrée : Français, Anglais…" />
        </div>
        <div>
          <label className="label" htmlFor="status">Statut</label>
          <select id="status" className="input" value={status} onChange={(e) => setStatus(e.target.value as OfferStatus)}>
            {Object.entries(OFFER_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">{error}</p>}
        <div className="flex gap-3 sm:col-span-2">
          <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
          <Link to="/rh/offres" className="btn-ghost">Annuler</Link>
        </div>
      </form>
    </div>
  )
}
