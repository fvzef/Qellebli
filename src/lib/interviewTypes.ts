export type InterviewStatus = 'programme' | 'realise' | 'annule'
export type InterviewResult = 'favorable' | 'reserve' | 'defavorable'

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  programme: 'Programmé',
  realise: 'Réalisé',
  annule: 'Annulé',
}

export const INTERVIEW_RESULT_LABELS: Record<InterviewResult, string> = {
  favorable: 'Favorable',
  reserve: 'Réservé',
  defavorable: 'Défavorable',
}

export interface Interview {
  id: string
  application_id: string
  scheduled_at: string
  interviewer_id: string
  location: string | null
  status: InterviewStatus
  score_communication: number | null
  score_motivation: number | null
  score_skills: number | null
  score_fit: number | null
  comments: string | null
  result: InterviewResult | null
  created_at: string
}

export const RATING_CRITERIA: { key: 'score_communication' | 'score_motivation' | 'score_skills' | 'score_fit'; label: string }[] = [
  { key: 'score_communication', label: 'Communication' },
  { key: 'score_motivation', label: 'Motivation' },
  { key: 'score_skills', label: 'Compétences' },
  { key: 'score_fit', label: 'Adéquation avec le poste' },
]

/** Valeur pour <input type="datetime-local"> en heure locale. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export interface Decision {
  id: string
  application_id: string
  decision: 'acceptee' | 'refusee'
  note: string | null
  decided_by: string | null
  decided_at: string
}
