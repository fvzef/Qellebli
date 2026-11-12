import { CITIES, DEPARTMENTS, FIELDS, LANGUAGES, LOCATIONS, SCHOOLS, SKILLS } from '../lib/suggestions'

function List({ id, items }: { id: string; items: string[] }) {
  return (
    <datalist id={id}>
      {items.map((i) => <option key={i} value={i} />)}
    </datalist>
  )
}

/** Listes de suggestions partagées par tous les champs de saisie (attribut « list »). */
export default function SuggestionLists() {
  return (
    <>
      <List id="dl-cities" items={CITIES} />
      <List id="dl-locations" items={LOCATIONS} />
      <List id="dl-schools" items={SCHOOLS} />
      <List id="dl-fields" items={FIELDS} />
      <List id="dl-departments" items={DEPARTMENTS} />
      <List id="dl-skills" items={SKILLS} />
      <List id="dl-languages" items={LANGUAGES} />
    </>
  )
}
