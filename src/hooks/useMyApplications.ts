import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ApplicationStatus } from '../lib/constants'

export interface MyApplication {
  id: string
  offer_id: string
  status: ApplicationStatus
  applied_at: string
  offers: { title: string; department: string | null; location: string | null } | null
}

export interface MyInterview {
  application_id: string
  scheduled_at: string
  location: string | null
  interviewer_name: string | null
}

export function useMyApplications() {
  return useQuery({
    queryKey: ['my-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('id, offer_id, status, applied_at, offers(title, department, location)')
        .order('applied_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as MyApplication[]
    },
  })
}

/** Entretiens programmés du candidat (date et lieu uniquement, jamais les évaluations). */
export function useMyInterviews() {
  return useQuery({
    queryKey: ['my-interviews'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_interviews')
      if (error) throw error
      return (data ?? []) as MyInterview[]
    },
  })
}
