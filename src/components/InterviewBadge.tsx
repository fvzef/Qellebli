import {
  INTERVIEW_RESULT_LABELS, INTERVIEW_STATUS_LABELS, type InterviewResult, type InterviewStatus,
} from '../lib/interviewTypes'

const base = 'inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium'

const STATUS: Record<InterviewStatus, string> = {
  programme: 'bg-beige-300 text-ink',
  realise: 'bg-accent-soft text-accent-dark',
  annule: 'bg-beige-100 text-muted',
}
const RESULT: Record<InterviewResult, string> = {
  favorable: 'bg-accent text-white',
  reserve: 'bg-beige-200 text-ink',
  defavorable: 'bg-danger-soft text-danger',
}

export function InterviewStatusBadge({ status }: { status: InterviewStatus }) {
  return <span className={`${base} ${STATUS[status]}`}>{INTERVIEW_STATUS_LABELS[status]}</span>
}

export function InterviewResultBadge({ result }: { result: InterviewResult | null }) {
  if (!result) return <span className="text-muted">—</span>
  return <span className={`${base} ${RESULT[result]}`}>{INTERVIEW_RESULT_LABELS[result]}</span>
}
