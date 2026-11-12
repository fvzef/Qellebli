import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { useList } from '../../hooks/useList'
import { EXPERIENCE_KIND_LABELS, type Experience, type ExperienceKind } from '../../lib/profileTypes'
import SectionCard, { ErrorBox } from './SectionCard'

export default function ExperiencesSection({ candidateId }: { candidateId: string }) {
  const { items, add, remove, error } = useList<Experience>('candidate_experiences', candidateId)
  const [kind, setKind] = useState<ExperienceKind>('experience')
  const [title, setTitle] = useState('')
  const [organization, setOrganization] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [description, setDescription] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const ok = await add({
      kind,
      title: title.trim(),
      organization: organization.trim() || null,
      start_date: start || null,
      end_date: end || null,
      description: description.trim() || null,
    })
    if (ok) { setTitle(''); setOrganization(''); setStart(''); setEnd(''); setDescription('') }
  }

  return (
    <SectionCard title="Expériences et certifications" hint="Stages, jobs, activités associatives, e-commerce, certifications…">
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value as ExperienceKind)} aria-label="Type">
          {Object.entries(EXPERIENCE_KIND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input className="input" placeholder="Intitulé" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Intitulé" />
        <input className="input sm:col-span-2" placeholder="Organisme / entreprise" value={organization} onChange={(e) => setOrganization(e.target.value)} />
        <div>
          <label className="label" htmlFor="xp-start">Début</label>
          <input id="xp-start" type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="xp-end">Fin</label>
          <input id="xp-end" type="date" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <textarea className="input sm:col-span-2" rows={3} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="sm:col-span-2"><button type="submit" className="btn-primary">Ajouter</button></div>
      </form>
      <ErrorBox message={error} />
      <ul className="mt-4 space-y-3">
        {items.map((x) => (
          <li key={x.id} className="rounded-lg border border-line bg-beige-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{x.title} <span className="ml-1 text-xs font-normal text-muted">({EXPERIENCE_KIND_LABELS[x.kind]})</span></p>
                {(x.organization || x.start_date) && (
                  <p className="text-sm text-muted">
                    {[x.organization, [x.start_date, x.end_date].filter(Boolean).join(' → ')].filter(Boolean).join(' · ')}
                  </p>
                )}
                {x.description && <p className="mt-1 text-sm text-muted">{x.description}</p>}
              </div>
              <button onClick={() => remove(x.id)} aria-label={`Supprimer ${x.title}`} className="text-muted hover:text-danger"><Trash2 size={16} /></button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-muted">Aucune entrée ajoutée.</li>}
      </ul>
    </SectionCard>
  )
}
