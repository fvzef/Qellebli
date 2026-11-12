import type { EducationLevel } from './profileTypes'

export type OfferStatus = 'brouillon' | 'publiee' | 'cloturee'
export type OfferType = 'stage' | 'alternance' | 'emploi_junior'

export const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  stage: 'Stage',
  alternance: 'Alternance',
  emploi_junior: 'Emploi junior',
}

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  brouillon: 'Brouillon',
  publiee: 'Publiée',
  cloturee: 'Clôturée',
}

export interface Offer {
  id: string
  title: string
  description: string
  department: string | null
  location: string | null
  type: OfferType
  min_education: EducationLevel | null
  target_field: string | null
  required_skills: string[]
  required_languages: string[]
  deadline: string | null
  status: OfferStatus
  created_by: string
  created_at: string
  published_at: string | null
  closed_at: string | null
}

export const formatDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'

export const todayIso = (): string => new Date().toISOString().slice(0, 10)

/** Une offre accepte des candidatures si elle est publiée et que la date limite n'est pas dépassée. */
export const isOpen = (o: Pick<Offer, 'status' | 'deadline'>): boolean =>
  o.status === 'publiee' && (!o.deadline || o.deadline >= todayIso())

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
