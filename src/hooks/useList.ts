import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type ListTable =
  | 'candidate_skills' | 'candidate_projects' | 'candidate_languages' | 'candidate_experiences'

/** Liste + ajout + suppression pour les tables enfants du profil candidat. */
export function useList<T extends { id: string }>(table: ListTable, candidateId: string | undefined) {
  const qc = useQueryClient()
  const key = [table, candidateId]
  const [error, setError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(candidateId),
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select('*').eq('candidate_id', candidateId!)
      if (error) throw error
      return (data ?? []) as T[]
    },
  })

  const add = async (payload: Record<string, unknown>): Promise<boolean> => {
    if (!candidateId) return false
    setError(null)
    const { error } = await supabase.from(table).insert({ ...payload, candidate_id: candidateId })
    if (error) {
      if (error.code === '23505') setError('Cet élément existe déjà.')
      else if (error.code === '23514') setError('La date de fin doit être postérieure à la date de début.')
      else setError(error.message)
      return false
    }
    await qc.invalidateQueries({ queryKey: key })
    return true
  }

  const remove = async (id: string) => {
    setError(null)
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) setError(error.message)
    else await qc.invalidateQueries({ queryKey: key })
  }

  return { items: query.data ?? [], loading: query.isLoading, error, add, remove }
}
