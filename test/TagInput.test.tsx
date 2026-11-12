import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import TagInput from '../src/components/TagInput'
import SuggestionLists from '../src/components/SuggestionLists'

function Harness({ initial = [] as string[] }) {
  const [v, setV] = useState<string[]>(initial)
  return (<><SuggestionLists /><TagInput id="t" value={v} onChange={setV} listId="dl-skills" placeholder="ph" />
    <output data-testid="out">{JSON.stringify(v)}</output></>)
}
const out = () => JSON.parse(screen.getByTestId('out').textContent!)
const box = () => document.getElementById('t') as HTMLInputElement
const type = (s: string) => fireEvent.change(box(), { target: { value: s } })

afterEach(cleanup)

describe('TagInput', () => {
  it('valide avec Entrée et avec la virgule', () => {
    render(<Harness />)
    type('Excel'); fireEvent.keyDown(box(), { key: 'Enter' })
    type('SQL'); fireEvent.keyDown(box(), { key: ',' })
    expect(out()).toEqual(['Excel', 'SQL'])
  })
  it('refuse les doublons (sans tenir compte de la casse) et les vides', () => {
    render(<Harness initial={['Excel']} />)
    type('excel'); fireEvent.keyDown(box(), { key: 'Enter' })
    type('   '); fireEvent.keyDown(box(), { key: 'Enter' })
    expect(out()).toEqual(['Excel'])
  })
  it('valide au clic ailleurs (blur)', () => {
    render(<Harness />)
    type('Power BI'); fireEvent.blur(box())
    expect(out()).toEqual(['Power BI'])
  })
  it('valide quand on choisit une suggestion de la liste', () => {
    render(<Harness />)
    fireEvent.input(box(), { target: { value: 'Canva' }, inputType: 'insertReplacementText' })
    expect(out()).toEqual(['Canva'])
  })
  it('Retour arrière supprime le dernier ; la croix supprime un élément', () => {
    render(<Harness initial={['A', 'B', 'C']} />)
    fireEvent.keyDown(box(), { key: 'Backspace' })
    expect(out()).toEqual(['A', 'B'])
    fireEvent.click(screen.getByLabelText('Retirer A'))
    expect(out()).toEqual(['B'])
  })
  it('les suggestions existent pour villes, établissements, filières, compétences, langues', () => {
    render(<Harness />)
    const count = (id: string) => document.getElementById(id)!.querySelectorAll('option').length
    for (const id of ['dl-cities', 'dl-schools', 'dl-fields', 'dl-skills', 'dl-languages', 'dl-departments', 'dl-locations'])
      expect(count(id), id).toBeGreaterThan(5)
    const opts = [...document.getElementById('dl-schools')!.querySelectorAll('option')].map((o) => o.getAttribute('value'))
    expect(opts).toContain('EST Casablanca')
    const cities = [...document.getElementById('dl-cities')!.querySelectorAll('option')].map((o) => o.getAttribute('value'))
    expect(cities).toContain('Casablanca')
    // pas de doublons dans les listes
    for (const id of ['dl-cities', 'dl-schools', 'dl-fields', 'dl-skills']) {
      const v = [...document.getElementById(id)!.querySelectorAll('option')].map((o) => o.getAttribute('value'))
      expect(new Set(v).size, `doublons dans ${id}`).toBe(v.length)
    }
  })
})
