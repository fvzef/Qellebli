import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Candidate } from '../lib/profileTypes'

/** Fiche candidat de l'utilisateur connecté. */
export function useCandidate() {
  const { session } = useAuth()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['candidate', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidates').select('*').eq('user_id', userId!).single()
      if (error) throw error
      return data as Candidate
    },
  })
}
