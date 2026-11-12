import { useCandidate } from '../../hooks/useCandidate'
import { useList } from '../../hooks/useList'
import type { Experience, LanguageRow, Project, Skill } from '../../lib/profileTypes'
import PersonalSection from '../../components/profile/PersonalSection'
import CvSection from '../../components/profile/CvSection'
import SkillsSection from '../../components/profile/SkillsSection'
import ProjectsSection from '../../components/profile/ProjectsSection'
import LanguagesSection from '../../components/profile/LanguagesSection'
import ExperiencesSection from '../../components/profile/ExperiencesSection'

export default function Profile() {
  const { data: c, isLoading, error } = useCandidate()
  const skills = useList<Skill>('candidate_skills', c?.id)
  const projects = useList<Project>('candidate_projects', c?.id)
  const languages = useList<LanguageRow>('candidate_languages', c?.id)
  const experiences = useList<Experience>('candidate_experiences', c?.id)

  if (isLoading) return <p className="text-sm text-muted">Chargement…</p>
  if (error || !c) return <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">Impossible de charger votre profil.</p>

  const checks = [
    { label: 'Coordonnées', ok: Boolean(c.phone && c.city) },
    { label: 'Formation', ok: Boolean(c.education_level && c.school && c.field_of_study) },
    { label: 'Présentation', ok: Boolean(c.summary) },
    { label: 'CV', ok: Boolean(c.cv_path) },
    { label: 'Compétences', ok: skills.items.length > 0 },
    { label: 'Projets', ok: projects.items.length > 0 },
    { label: 'Langues', ok: languages.items.length > 0 },
    { label: 'Expériences', ok: experiences.items.length > 0 },
  ]
  const done = checks.filter((x) => x.ok).length
  const pct = Math.round((done / checks.length) * 100)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Mon profil</h1>
        <p className="mt-1 text-sm text-muted">Un profil complet permet aux recruteurs de mieux évaluer votre candidature.</p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Complétude du profil</span>
          <span className="text-muted">{pct} %</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-beige-200">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {checks.map((x) => (
            <span key={x.label} className={`rounded-full px-2.5 py-0.5 text-xs ${x.ok ? 'bg-accent-soft text-accent-dark' : 'bg-beige-100 text-muted'}`}>
              {x.ok ? '✓ ' : ''}{x.label}
            </span>
          ))}
        </div>
      </div>

      <PersonalSection candidate={c} />
      <CvSection candidate={c} />
      <SkillsSection candidateId={c.id} />
      <ProjectsSection candidateId={c.id} />
      <LanguagesSection candidateId={c.id} />
      <ExperiencesSection candidateId={c.id} />
    </div>
  )
}
