import type { ApplicationStatus } from './constants'

/** Ordre des colonnes du pipeline. */
export const PIPELINE_ORDER: ApplicationStatus[] = [
  'recue', 'en_verification', 'en_evaluation', 'preselectionnee', 'entretien_programme', 'acceptee', 'refusee',
]

export const isFinalStatus = (s: ApplicationStatus): boolean => s === 'acceptee' || s === 'refusee'

/** Une carte déjà décidée est verrouillée ; on ne « déplace » pas vers la colonne où l'on est déjà. */
export const canMove = (from: ApplicationStatus, to: ApplicationStatus): boolean =>
  from !== to && !isFinalStatus(from)

export const targetsFor = (from: ApplicationStatus): ApplicationStatus[] =>
  PIPELINE_ORDER.filter((s) => canMove(from, s))

export const daysSince = (iso: string, now: number = Date.now()): number =>
  Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000))

export interface PipelineCard {
  id: string
  status: ApplicationStatus
  name: string
  offerTitle: string
  score: number | null
  daysInStage: number
}
