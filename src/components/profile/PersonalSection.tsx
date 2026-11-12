import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { EDUCATION_LABELS, type Candidate, type EducationLevel } from '../../lib/profileTypes'
import SectionCard, { ErrorBox } from './SectionCard'

export default function PersonalSection({ candidate }: { candidate: Candidate }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    phone: candidate.phone ?? '',
    city: candidate.city ?? '',
    education_level: candidate.education_level ?? '',
    school: candidate.school ?? '',
    field_of_study: candidate.field_of_study ?? '',
    graduation_year: candidate.graduation_year?.toString() ?? '',
    summary: candidate.summary ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const set = (k: keyof typeof form, v: string) => { setForm({ ...form, [k]: v }); setSaved(false) }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    const { error } = await supabase.from('candidates').update({
      phone: form.phone.trim() || null,
      city: form.city.trim() || null,
      education_level: form.education_level || null,
      school: form.school.trim() || null,
      field_of_study: form.field_of_study.trim() || null,
      graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
      summary: form.summary.trim() || null,
    }).eq('id', candidate.id)
    if (error) setError(error.message)
    else { setSaved(true); await qc.invalidateQueries({ queryKey: ['candidate'] }) }
    setBusy(false)
  }

  return (
    <SectionCard title="Informations personnelles et formation">
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="phone">Téléphone</label>
          <input id="phone" className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="city">Ville</label>
          <input id="city" list="dl-cities" autoComplete="off" className="input" value={form.city} onChange={(e) => set('city', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="edu">Niveau d'études</label>
          <select id="edu" className="input" value={form.education_level}
            onChange={(e) => set('education_level', e.target.value as EducationLevel | '')}>
            <option value="">Sélectionner…</option>
            {Object.entries(EDUCATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="year">Année de diplôme (prévue)</label>
          <input id="year" type="number" min={1990} max={2100} className="input"
            value={form.graduation_year} onChange={(e) => set('graduation_year', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="school">Établissement</label>
          <input id="school" list="dl-schools" autoComplete="off" className="input" value={form.school} onChange={(e) => set('school', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="field">Filière</label>
          <input id="field" list="dl-fields" autoComplete="off" className="input" value={form.field_of_study} onChange={(e) => set('field_of_study', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="summary">Présentation</label>
          <textarea id="summary" rows={4} className="input" value={form.summary}
            onChange={(e) => set('summary', e.target.value)} />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
          {saved && <span className="text-sm text-accent-dark">Enregistré ✓</span>}
        </div>
      </form>
      <ErrorBox message={error} />
    </SectionCard>
  )
}
