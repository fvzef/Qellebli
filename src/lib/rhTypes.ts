import type { ApplicationStatus } from './constants'

export interface Evaluation {
  id: string
  application_id: string
  score_education: number
  score_skills: number
  score_projects: number
  score_languages: number
  score_experience: number
  score_global: number
  strengths: string[]
  improvements: string[]
  explanation: string | null
  evaluated_at: string
}

export type CriterionKey =
  'score_education' | 'score_skills' | 'score_projects' | 'score_languages' | 'score_experience'

export const CRITERIA: { key: CriterionKey; label: string; weight: number }[] = [
  { key: 'score_education', label: 'Formation', weight: 25 },
  { key: 'score_skills', label: 'Compétences techniques', weight: 30 },
  { key: 'score_projects', label: 'Projets', weight: 20 },
  { key: 'score_languages', label: 'Langues', weight: 15 },
  { key: 'score_experience', label: 'Expériences complémentaires', weight: 10 },
]

export interface HistoryRow {
  id: string
  application_id: string
  new_status: ApplicationStatus
  changed_at: string
}

/** PostgREST renvoie parfois un objet, parfois un tableau pour une relation 1-1. */
export function one<T>(x: T | T[] | null | undefined): T | null {
  if (Array.isArray(x)) return x[0] ?? null
  return x ?? null
}

export const num = (x: number | string | null | undefined): number => Number(x ?? 0)
