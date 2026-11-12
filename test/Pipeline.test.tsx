import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PipelineBoard from '../src/components/pipeline/PipelineBoard'
import { PIPELINE_ORDER, canMove, daysSince, targetsFor, type PipelineCard } from '../src/lib/pipeline'

afterEach(cleanup)

const card = (id: string, status: PipelineCard['status'], name = id, score: number | null = 50): PipelineCard =>
  ({ id, status, name, offerTitle: 'Offre test', score, daysInStage: 2 })

const setup = (cards: PipelineCard[]) => {
  const onMove = vi.fn()
  render(<MemoryRouter><PipelineBoard cards={cards} onMove={onMove} showOffer /></MemoryRouter>)
  return onMove
}
const dt = () => ({ dataTransfer: { setData: vi.fn(), effectAllowed: '' } })

describe('règles de déplacement', () => {
  it('une candidature décidée est verrouillée', () => {
    expect(canMove('acceptee', 'recue')).toBe(false)
    expect(canMove('refusee', 'en_evaluation')).toBe(false)
  })
  it('on ne se déplace pas vers sa propre colonne', () => expect(canMove('recue', 'recue')).toBe(false))
  it('on peut avancer, reculer et décider depuis un statut en cours', () => {
    expect(canMove('recue', 'preselectionnee')).toBe(true)
    expect(canMove('preselectionnee', 'recue')).toBe(true)
    expect(canMove('entretien_programme', 'acceptee')).toBe(true)
  })
  it('targetsFor exclut la colonne actuelle et tout si décidé', () => {
    expect(targetsFor('recue')).toHaveLength(PIPELINE_ORDER.length - 1)
    expect(targetsFor('recue')).not.toContain('recue')
    expect(targetsFor('acceptee')).toEqual([])
  })
  it('daysSince calcule des jours entiers, jamais négatifs', () => {
    const now = Date.parse('2026-11-10T12:00:00Z')
    expect(daysSince('2026-11-07T12:00:00Z', now)).toBe(3)
    expect(daysSince('2026-11-10T01:00:00Z', now)).toBe(0)
    expect(daysSince('2026-11-12T12:00:00Z', now)).toBe(0)
  })
})

describe('PipelineBoard', () => {
  it('affiche les 7 colonnes avec leur nombre de cartes', () => {
    setup([card('a', 'recue'), card('b', 'recue'), card('c', 'acceptee')])
    for (const s of PIPELINE_ORDER) expect(screen.getByTestId(`col-${s}`)).toBeTruthy()
    expect(within(screen.getByTestId('col-recue')).getByText('2')).toBeTruthy()
    expect(within(screen.getByTestId('col-acceptee')).getByText('1')).toBeTruthy()
  })

  it('glisser une carte vers une autre colonne appelle onMove (carte, statut cible)', () => {
    const onMove = setup([card('a', 'recue', 'Alice')])
    fireEvent.dragStart(screen.getByTestId('card-a'), dt())
    fireEvent.dragOver(screen.getByTestId('col-en_verification'))
    fireEvent.drop(screen.getByTestId('col-en_verification'))
    expect(onMove).toHaveBeenCalledTimes(1)
    expect(onMove.mock.calls[0][0].id).toBe('a')
    expect(onMove.mock.calls[0][1]).toBe('en_verification')
  })

  it('déposer sur sa propre colonne ne fait rien', () => {
    const onMove = setup([card('a', 'recue')])
    fireEvent.dragStart(screen.getByTestId('card-a'), dt())
    fireEvent.drop(screen.getByTestId('col-recue'))
    expect(onMove).not.toHaveBeenCalled()
  })

  it('une carte décidée n\'est pas déplaçable et n\'a pas de menu', () => {
    const onMove = setup([card('z', 'acceptee', 'Zoe')])
    const el = screen.getByTestId('card-z')
    expect(el.getAttribute('draggable')).toBe('false')
    fireEvent.dragStart(el, dt())
    fireEvent.drop(screen.getByTestId('col-recue'))
    expect(onMove).not.toHaveBeenCalled()
    expect(within(el).queryByLabelText('Déplacer Zoe')).toBeNull()
    expect(within(el).getByText('Décision prise')).toBeTruthy()
  })

  it('déposer vers Acceptée / Refusée / Entretien est signalé tel quel (la page ouvre la confirmation)', () => {
    const onMove = setup([card('a', 'preselectionnee')])
    for (const to of ['acceptee', 'refusee', 'entretien_programme'] as const) {
      fireEvent.dragStart(screen.getByTestId('card-a'), dt())
      fireEvent.drop(screen.getByTestId(`col-${to}`))
      expect(onMove).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'a' }), to)
    }
  })

  it('le menu « Déplacer… » déplace la carte (alternative mobile)', () => {
    const onMove = setup([card('a', 'recue', 'Alice')])
    fireEvent.change(screen.getByLabelText('Déplacer Alice'), { target: { value: 'preselectionnee' } })
    expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), 'preselectionnee')
  })

  it('le menu ne propose pas la colonne actuelle', () => {
    setup([card('a', 'en_evaluation', 'Alice')])
    const options = [...(screen.getByLabelText('Déplacer Alice') as HTMLSelectElement).options].map((o) => o.value)
    expect(options).not.toContain('en_evaluation')
    expect(options).toContain('acceptee')
  })
})
