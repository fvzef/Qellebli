import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { useList } from '../../hooks/useList'
import { LANGUAGE_LEVEL_LABELS, type LanguageLevel, type LanguageRow } from '../../lib/profileTypes'
import SectionCard, { ErrorBox } from './SectionCard'

export default function LanguagesSection({ candidateId }: { candidateId: string }) {
  const { items, add, remove, error } = useList<LanguageRow>('candidate_languages', candidateId)
  const [language, setLanguage] = useState('')
  const [level, setLevel] = useState<LanguageLevel>('intermediaire')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!language.trim()) return
    if (await add({ language: language.trim(), level })) setLanguage('')
  }

  return (
    <SectionCard title="Langues">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input list="dl-languages" autoComplete="off" className="input sm:flex-1" placeholder="Ex. Français, Anglais, Arabe…" value={language}
          onChange={(e) => setLanguage(e.target.value)} aria-label="Langue" />
        <select className="input sm:w-52" value={level} onChange={(e) => setLevel(e.target.value as LanguageLevel)} aria-label="Niveau">
          {Object.entries(LANGUAGE_LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button type="submit" className="btn-primary">Ajouter</button>
      </form>
      <ErrorBox message={error} />
      <ul className="mt-4 flex flex-wrap gap-2">
        {items.map((l) => (
          <li key={l.id} className="flex items-center gap-2 rounded-full border border-line bg-beige-50 py-1 pl-3 pr-2 text-sm">
            <span className="font-medium">{l.language}</span>
            <span className="text-muted">· {LANGUAGE_LEVEL_LABELS[l.level]}</span>
            <button onClick={() => remove(l.id)} aria-label={`Supprimer ${l.language}`} className="text-muted hover:text-danger"><Trash2 size={14} /></button>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-muted">Aucune langue ajoutée.</li>}
      </ul>
    </SectionCard>
  )
}
