import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { useList } from '../../hooks/useList'
import type { Skill } from '../../lib/profileTypes'
import SectionCard, { ErrorBox } from './SectionCard'

const LEVELS = ['Notions', 'Débutant', 'Intermédiaire', 'Avancé', 'Expert']

export default function SkillsSection({ candidateId }: { candidateId: string }) {
  const { items, add, remove, error } = useList<Skill>('candidate_skills', candidateId)
  const [name, setName] = useState('')
  const [level, setLevel] = useState(3)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (await add({ name: name.trim(), level })) setName('')
  }

  return (
    <SectionCard title="Compétences techniques">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input list="dl-skills" autoComplete="off" className="input sm:flex-1" placeholder="Ex. Excel, SQL, Power BI…" value={name}
          onChange={(e) => setName(e.target.value)} aria-label="Compétence" />
        <select className="input sm:w-44" value={level} onChange={(e) => setLevel(Number(e.target.value))} aria-label="Niveau">
          {LEVELS.map((l, i) => <option key={l} value={i + 1}>{l}</option>)}
        </select>
        <button type="submit" className="btn-primary">Ajouter</button>
      </form>
      <ErrorBox message={error} />
      <ul className="mt-4 flex flex-wrap gap-2">
        {[...items].sort((a, b) => a.name.localeCompare(b.name)).map((s) => (
          <li key={s.id} className="flex items-center gap-2 rounded-full border border-line bg-beige-50 py-1 pl-3 pr-2 text-sm">
            <span className="font-medium">{s.name}</span>
            <span className="text-muted">· {LEVELS[s.level - 1]}</span>
            <button onClick={() => remove(s.id)} aria-label={`Supprimer ${s.name}`} className="text-muted hover:text-danger">
              <Trash2 size={14} />
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-muted">Aucune compétence ajoutée.</li>}
      </ul>
    </SectionCard>
  )
}
