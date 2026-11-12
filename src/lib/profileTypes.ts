export type EducationLevel = 'bac' | 'bac_plus_2' | 'bac_plus_3' | 'bac_plus_5' | 'doctorat'
export type LanguageLevel = 'debutant' | 'intermediaire' | 'avance' | 'courant' | 'natif'
export type ProjectKind = 'academique' | 'personnel'
export type ExperienceKind = 'experience' | 'certification'

export const EDUCATION_LABELS: Record<EducationLevel, string> = {
  bac: 'Baccalauréat',
  bac_plus_2: 'Bac +2 (DUT, BTS…)',
  bac_plus_3: 'Bac +3 (Licence…)',
  bac_plus_5: 'Bac +5 (Master, Ingénieur…)',
  doctorat: 'Doctorat',
}

export const LANGUAGE_LEVEL_LABELS: Record<LanguageLevel, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
  courant: 'Courant',
  natif: 'Langue maternelle',
}

export const PROJECT_KIND_LABELS: Record<ProjectKind, string> = {
  academique: 'Académique',
  personnel: 'Personnel',
}

export const EXPERIENCE_KIND_LABELS: Record<ExperienceKind, string> = {
  experience: 'Expérience',
  certification: 'Certification',
}

export interface Candidate {
  id: string
  user_id: string
  phone: string | null
  city: string | null
  education_level: EducationLevel | null
  school: string | null
  field_of_study: string | null
  graduation_year: number | null
  summary: string | null
  cv_path: string | null
}

export interface Skill { id: string; name: string; level: number }
export interface Project {
  id: string; title: string; kind: ProjectKind
  description: string | null; tech_stack: string[]; url: string | null
}
export interface LanguageRow { id: string; language: string; level: LanguageLevel }
export interface Experience {
  id: string; kind: ExperienceKind; title: string; organization: string | null
  start_date: string | null; end_date: string | null; description: string | null
}
