import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'

interface Props {
  id?: string
  value: string[]
  onChange: (v: string[]) => void
  listId: string
  placeholder?: string
}

/** Saisie de plusieurs éléments : suggestions pendant la frappe, Entrée ou virgule pour valider. */
export default function TagInput({ id, value, onChange, listId, placeholder }: Props) {
  const [draft, setDraft] = useState('')

  const commit = (raw: string) => {
    const t = raw.replace(/,/g, ' ').trim()
    if (!t) return
    if (!value.some((v) => v.toLowerCase() === t.toLowerCase())) onChange([...value, t])
    setDraft('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit(draft)
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
      {value.map((v) => (
        <span key={v} className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-sm text-accent-dark">
          {v}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Retirer ${v}`}>
            <X size={13} />
          </button>
        </span>
      ))}
      <input
        id={id}
        list={listId}
        value={draft}
        placeholder={value.length === 0 ? placeholder : ''}
        onChange={(e) => {
          // Choisir une suggestion dans la liste la valide aussitôt
          if ((e.nativeEvent as InputEvent).inputType === 'insertReplacementText') commit(e.target.value)
          else setDraft(e.target.value)
        }}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
        className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted/70"
      />
    </div>
  )
}
