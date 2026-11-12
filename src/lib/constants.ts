export type Role = 'candidat' | 'rh' | 'direction'

export type ApplicationStatus =
  | 'recue' | 'en_verification' | 'en_evaluation' | 'preselectionnee'
  | 'entretien_programme' | 'acceptee' | 'refusee'

export const ROLE_LABELS: Record<Role, string> = {
  candidat: 'Candidat',
  rh: 'Responsable RH',
  direction: 'Direction',
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  recue: 'Reçue',
  en_verification: 'En vérification',
  en_evaluation: "En cours d'évaluation",
  preselectionnee: 'Présélectionnée',
  entretien_programme: 'Entretien programmé',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
}

export const homeForRole = (role: Role): string => `/${role}`

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
}
