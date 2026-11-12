import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && anonKey)

// Valeurs de repli pour éviter un écran blanc si le .env est absent
export const supabase = createClient(url || 'http://localhost', anonKey || 'missing-key')
