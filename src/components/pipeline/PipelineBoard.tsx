import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { STATUS_LABELS, type ApplicationStatus } from '../../lib/constants'
import { PIPELINE_ORDER, canMove, isFinalStatus, targetsFor, type PipelineCard } from '../../lib/pipeline'
import ScoreBadge from '../ScoreBadge'

interface Props {
  cards: PipelineCard[]
  onMove: (card: PipelineCard, to: ApplicationStatus) => void
  showOffer: boolean
}

const COLUMN_TINT: Partial<Record<ApplicationStatus, string>> = {
  acceptee: 'bg-accent-soft/60',
  refusee: 'bg-danger-soft/60',
}

/** Tableau de bord visuel : une colonne par statut, cartes déplaçables (glisser-déposer ou menu). */
export default function PipelineBoard({ cards, onMove, showOffer }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<ApplicationStatus | null>(null)
  const dragging = cards.find((c) => c.id === draggingId) ?? null

  const endDrag = () => { setDraggingId(null); setOverCol(null) }

  return (
    <div className="flex gap-3 overflow-x-auto pb-3" data-testid="pipeline-board">
      {PIPELINE_ORDER.map((col) => {
        const colCards = cards.filter((c) => c.status === col)
        const droppable = dragging !== null && canMove(dragging.status, col)
        return (
          <section
            key={col}
            data-testid={`col-${col}`}
            aria-label={STATUS_LABELS[col]}
            onDragOver={(e) => { if (droppable) { e.preventDefault(); setOverCol(col) } }}
            onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
            onDrop={(e) => {
              e.preventDefault()
              if (dragging && canMove(dragging.status, col)) onMove(dragging, col)
              endDrag()
            }}
            className={`flex w-64 shrink-0 flex-col rounded-xl border p-2.5 transition-colors ${
              overCol === col && droppable ? 'border-accent bg-accent-soft' : `border-line ${COLUMN_TINT[col] ?? 'bg-beige-100/60'}`}`}
          >
            <header className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold">{STATUS_LABELS[col]}</h2>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-muted">{colCards.length}</span>
            </header>

            <div className="flex min-h-[4rem] flex-1 flex-col gap-2">
              {colCards.length === 0 && (
                <p className="rounded-lg border border-dashed border-line px-2 py-4 text-center text-xs text-muted">Aucune carte</p>
              )}
              {colCards.map((card) => {
                const locked = isFinalStatus(card.status)
                return (
                  <article
                    key={card.id}
                    data-testid={`card-${card.id}`}
                    draggable={!locked}
                    onDragStart={(e) => {
                      if (locked) return
                      e.dataTransfer.setData('text/plain', card.id)
                      e.dataTransfer.effectAllowed = 'move'
                      setDraggingId(card.id)
                    }}
                    onDragEnd={endDrag}
                    className={`rounded-lg border border-line bg-white p-2.5 shadow-sm ${
                      locked ? 'opacity-90' : 'cursor-grab active:cursor-grabbing'} ${draggingId === card.id ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/rh/candidatures/${card.id}`} className="text-sm font-medium hover:text-accent hover:underline">
                        {card.name || '—'}
                      </Link>
                      <ScoreBadge score={card.score} />
                    </div>
                    {showOffer && <p className="mt-0.5 truncate text-xs text-muted">{card.offerTitle}</p>}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {locked ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted"><Lock size={12} /> Décision prise</span>
                      ) : (
                        <>
                          <span className="text-xs text-muted">
                            {card.daysInStage === 0 ? "Aujourd'hui" : `Depuis ${card.daysInStage} j`}
                          </span>
                          <select
                            aria-label={`Déplacer ${card.name}`}
                            value=""
                            onChange={(e) => { if (e.target.value) onMove(card, e.target.value as ApplicationStatus) }}
                            className="max-w-[7.5rem] rounded border border-line bg-white px-1 py-0.5 text-xs text-muted"
                          >
                            <option value="">Déplacer…</option>
                            {targetsFor(card.status).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                          </select>
                        </>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
