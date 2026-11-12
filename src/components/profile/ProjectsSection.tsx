import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { useList } from '../../hooks/useList'
import { PROJECT_KIND_LABELS, type Project, type ProjectKind } from '../../lib/profileTypes'
import SectionCard, { ErrorBox } from './SectionCard'
import TagInput from '../TagInput'

export default function ProjectsSection({ candidateId }: { candidateId: string }) {
  const { items, add, remove, error } = useList<Project>('candidate_projects', candidateId)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<ProjectKind>('academique')
  const [description, setDescription] = useState('')
  const [stack, setStack] = useState<string[]>([])
  const [url, setUrl] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const ok = await add({
      title: title.trim(),
      kind,
      description: description.trim() || null,
      tech_stack: stack,
      url: url.trim() || null,
    })
    if (ok) { setTitle(''); setDescription(''); setStack([]); setUrl('') }
  }

  return (
    <SectionCard title="Projets académiques et personnels">
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder="Titre du projet" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Titre" />
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value as ProjectKind)} aria-label="Type">
          {Object.entries(PROJECT_KIND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <textarea className="input sm:col-span-2" rows={3} placeholder="Description (objectif, votre rôle, résultat)"
          value={description} onChange={(e) => setDescription(e.target.value)} />
        <TagInput value={stack} onChange={setStack} listId="dl-skills" placeholder="Outils utilisés : tapez puis Entrée" />
        <input className="input" placeholder="Lien (facultatif)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <div className="sm:col-span-2"><button type="submit" className="btn-primary">Ajouter le projet</button></div>
      </form>
      <ErrorBox message={error} />
      <ul className="mt-4 space-y-3">
        {items.map((p) => (
          <li key={p.id} className="rounded-lg border border-line bg-beige-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{p.title} <span className="ml-1 text-xs font-normal text-muted">({PROJECT_KIND_LABELS[p.kind]})</span></p>
                {p.description && <p className="mt-1 text-sm text-muted">{p.description}</p>}
                {p.tech_stack.length > 0 && <p className="mt-1 text-xs text-accent-dark">{p.tech_stack.join(' · ')}</p>}
                {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-accent hover:underline">{p.url}</a>}
              </div>
              <button onClick={() => remove(p.id)} aria-label={`Supprimer ${p.title}`} className="text-muted hover:text-danger"><Trash2 size={16} /></button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-muted">Aucun projet ajouté.</li>}
      </ul>
    </SectionCard>
  )
}
