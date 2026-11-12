import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { DashboardData } from '../lib/dashboardTypes'

/** Indicateurs RH calculés par la base de données (toutes offres, ou une seule). */
export function useDashboard(offerId: string = '') {
  return useQuery({
    queryKey: ['dashboard', offerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_hr_dashboard', { p_offer: offerId || null })
      if (error) throw error
      return data as DashboardData
    },
  })
}

export function useDashboardOffers() {
  return useQuery({
    queryKey: ['dashboard-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers').select('id, title').neq('status', 'brouillon').order('title')
      if (error) throw error
      return (data ?? []) as { id: string; title: string }[]
    },
  })
}
