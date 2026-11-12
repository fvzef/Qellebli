import { STATUS_LABELS, type ApplicationStatus } from '../lib/constants'
import { OFFER_STATUS_LABELS, type OfferStatus } from '../lib/offerTypes'

const APPLICATION_STYLES: Record<ApplicationStatus, string> = {
  recue: 'bg-beige-100 text-ink',
  en_verification: 'bg-beige-200 text-ink',
  en_evaluation: 'bg-accent-soft text-accent-dark',
  preselectionnee: 'bg-accent-soft text-accent-dark',
  entretien_programme: 'bg-beige-300 text-ink',
  acceptee: 'bg-accent text-white',
  refusee: 'bg-danger-soft text-danger',
}

const OFFER_STYLES: Record<OfferStatus, string> = {
  brouillon: 'bg-beige-200 text-ink',
  publiee: 'bg-accent-soft text-accent-dark',
  cloturee: 'bg-beige-100 text-muted',
}

const base = 'inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium'

export default function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`${base} ${APPLICATION_STYLES[status]}`}>{STATUS_LABELS[status]}</span>
}

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  return <span className={`${base} ${OFFER_STYLES[status]}`}>{OFFER_STATUS_LABELS[status]}</span>
}
