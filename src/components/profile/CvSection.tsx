import { useState, type ChangeEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FileText, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Candidate } from '../../lib/profileTypes'
import SectionCard, { ErrorBox } from './SectionCard'

const MAX_MB = 5
const ALLOWED = ['pdf', 'doc', 'docx']

export default function CvSection({ candidate }: { candidate: Candidate }) {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED.includes(ext)) return setError('Format non accepté : PDF, DOC ou DOCX uniquement.')
    if (file.size > MAX_MB * 1024 * 1024) return setError(`Fichier trop lourd (maximum ${MAX_MB} Mo).`)

    setBusy(true)
    // Le dossier = id de l'utilisateur (exigé par les règles de sécurité)
    const path = `${candidate.user_id}/cv-${Date.now()}.${ext}`
    const up = await supabase.storage.from('cvs').upload(path, file)
    if (up.error) { setError(up.error.message); setBusy(false); return }

    const upd = await supabase.from('candidates').update({ cv_path: path }).eq('id', candidate.id)
    if (upd.error) { setError(upd.error.message); setBusy(false); return }

    // Suppression de l'ancien CV (sans bloquer en cas d'échec)
    if (candidate.cv_path) await supabase.storage.from('cvs').remove([candidate.cv_path])
    await qc.invalidateQueries({ queryKey: ['candidate'] })
    setBusy(false)
  }

  const openCv = async () => {
    if (!candidate.cv_path) return
    const { data, error } = await supabase.storage.from('cvs').createSignedUrl(candidate.cv_path, 60)
    if (error || !data) return setError("Impossible d'ouvrir le CV.")
    window.open(data.signedUrl, '_blank')
  }

  return (
    <SectionCard title="Mon CV" hint={`PDF, DOC ou DOCX — ${MAX_MB} Mo maximum. Visible uniquement par vous et les recruteurs.`}>
      <div className="flex flex-wrap items-center gap-3">
        {candidate.cv_path && (
          <button onClick={openCv} className="btn-ghost"><FileText size={16} /> Consulter mon CV</button>
        )}
        <label className={`btn-primary cursor-pointer ${busy ? 'pointer-events-none opacity-60' : ''}`}>
          <Upload size={16} /> {busy ? 'Envoi…' : candidate.cv_path ? 'Remplacer mon CV' : 'Téléverser mon CV'}
          <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={onFile} />
        </label>
      </div>
      <ErrorBox message={error} />
    </SectionCard>
  )
}
