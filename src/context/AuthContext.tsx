import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/constants'
import { loadAccounts, removeAccount, saveAccounts, upsertAccount, type StoredAccount } from '../lib/accounts'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  /** Comptes mémorisés sur cet appareil (dont le compte actif). */
  accounts: StoredAccount[]
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (fullName: string, email: string, password: string) =>
    Promise<{ error: string | null; needsConfirmation: boolean }>
  signInWithGoogle: () => Promise<string | null>
  /** Se déconnecte du compte actif et l'oublie. Les autres comptes mémorisés restent disponibles. */
  signOut: () => Promise<void>
  /** Passe à un autre compte mémorisé, sans mot de passe. Renvoie un message d'erreur ou null. */
  switchAccount: (userId: string) => Promise<string | null>
  /** Oublie un compte mémorisé sur cet appareil (sans le déconnecter ailleurs). */
  forgetAccount: (userId: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function translateError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.'
  if (message.includes('Email not confirmed')) return 'Veuillez confirmer votre email avant de vous connecter.'
  if (message.includes('already registered')) return 'Un compte existe déjà avec cet email.'
  if (message.includes('provider is not enabled') || message.includes('Unsupported provider'))
    return "La connexion Google n'est pas encore activée sur ce projet."
  if (/signups? (are )?(disabled|not allowed)/i.test(message)) return 'Les inscriptions sont fermées pour le moment.'
  if (message.includes('Database error saving new user')) return "Inscription refusée : cette adresse e-mail n'est pas autorisée."
  if (message.includes('Password should be')) return 'Le mot de passe doit contenir au moins 8 caractères.'
  return message
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles')
    .select('id, email, full_name, role').eq('id', userId).single()
  return error ? null : (data as Profile)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Comptes mémorisés : la référence contient toujours la dernière liste (pas de course entre événements)
  const accountsRef = useRef<StoredAccount[]>(loadAccounts())
  const [accounts, setAccounts] = useState<StoredAccount[]>(accountsRef.current)
  const updateAccounts = useCallback((fn: (list: StoredAccount[]) => StoredAccount[]) => {
    const next = fn(accountsRef.current)
    accountsRef.current = next
    setAccounts(next)
    saveAccounts(next)
  }, [])

  const lastUser = useRef<string | null>(null)

  // 1. Suivi de la session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      lastUser.current = data.session?.user.id ?? null
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      const uid = s?.user.id ?? null
      if (uid !== lastUser.current) {
        // Changement de compte ou déconnexion : aucune donnée de l'ancien compte ne doit rester affichable
        if (lastUser.current !== null) qc.clear()
        if (s) { setProfile(null); setLoading(true) }
      }
      lastUser.current = uid
      setSession(s)
      if (s) {
        // Les jetons sont renouvelés régulièrement : on garde la copie mémorisée à jour
        updateAccounts((list) => list.map((a) => (a.userId === s.user.id
          ? { ...a, access_token: s.access_token, refresh_token: s.refresh_token } : a)))
      } else {
        setProfile(null); setLoading(false)
      }
    })
    return () => sub.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2. Chargement du profil (rôle) quand l'utilisateur change, puis mémorisation du compte
  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoading(true)
    fetchProfile(userId).then(async (p) => {
      if (cancelled) return
      setProfile(p)
      setLoading(false)
      if (!p) return
      const { data } = await supabase.auth.getSession()
      const s = data.session
      if (!cancelled && s && s.user.id === p.id) {
        updateAccounts((list) => upsertAccount(list, {
          userId: p.id, email: p.email, name: p.full_name, role: p.role,
          access_token: s.access_token, refresh_token: s.refresh_token,
        }))
      }
    })
    return () => { cancelled = true }
  }, [userId, updateAccounts])

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? translateError(error.message) : null
  }

  const signUp: AuthContextValue['signUp'] = async (fullName, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName } },
    })
    if (error) return { error: translateError(error.message), needsConfirmation: false }
    return { error: null, needsConfirmation: !data.session }
  }

  const signInWithGoogle: AuthContextValue['signInWithGoogle'] = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/connexion` },
    })
    return error ? translateError(error.message) : null
  }

  const switchAccount: AuthContextValue['switchAccount'] = async (targetId) => {
    const target = accountsRef.current.find((a) => a.userId === targetId)
    if (!target) return 'Compte introuvable.'
    if (target.userId === session?.user.id) return null

    // 1. Garder les derniers jetons du compte actuel (ils ont pu être renouvelés depuis la dernière copie)
    const { data: cur } = await supabase.auth.getSession()
    const c = cur.session
    if (c) {
      updateAccounts((list) => list.map((a) => (a.userId === c.user.id
        ? { ...a, access_token: c.access_token, refresh_token: c.refresh_token } : a)))
    }

    // 2. Bascule vers le compte choisi
    const { data, error } = await supabase.auth.setSession({
      access_token: target.access_token, refresh_token: target.refresh_token,
    })
    if (error || !data.session) {
      updateAccounts((list) => removeAccount(list, targetId))
      return 'La session de ce compte a expiré : reconnectez-vous avec « Ajouter un compte ».'
    }
    const s = data.session
    updateAccounts((list) => list.map((a) => (a.userId === targetId
      ? { ...a, access_token: s.access_token, refresh_token: s.refresh_token } : a)))
    return null
  }

  const forgetAccount = useCallback((id: string) => updateAccounts((list) => removeAccount(list, id)), [updateAccounts])

  const signOut = async () => {
    const uid = session?.user.id
    await supabase.auth.signOut()
    if (uid) updateAccounts((list) => removeAccount(list, uid))
  }

  return (
    <AuthContext.Provider value={{
      session, profile, loading, accounts, signIn, signUp, signInWithGoogle, signOut, switchAccount, forgetAccount,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
