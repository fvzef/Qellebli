import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { loadAccounts, removeAccount, upsertAccount, type StoredAccount } from '../src/lib/accounts'

const h = vi.hoisted(() => {
  const state: { current: any; listeners: Array<(e: string, s: any) => void>; users: Record<string, any>; n: number } =
    { current: null, listeners: [], users: {}, n: 1 }
  const emit = (event: string, s: any) => state.listeners.forEach((l) => l(event, s))
  const mk = (uid: string, n: number) => ({ access_token: `at-${uid}-${n}`, refresh_token: `rt-${uid}-${n}`, user: { id: uid } })
  const fake = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: state.current } })),
      onAuthStateChange: vi.fn((cb: (e: string, s: any) => void) => {
        state.listeners.push(cb)
        return { data: { subscription: { unsubscribe: () => {} } } }
      }),
      setSession: vi.fn(async ({ refresh_token }: { refresh_token: string }) => {
        const uid = refresh_token.split('-')[1]
        if (!state.users[uid] || state.users[uid].revoked) return { data: { session: null, user: null }, error: { message: 'Invalid Refresh Token' } }
        const s = mk(uid, ++state.n)
        state.current = s
        emit('SIGNED_IN', s)
        return { data: { session: s, user: s.user }, error: null }
      }),
      signOut: vi.fn(async () => { state.current = null; emit('SIGNED_OUT', null); return { error: null } }),
      signInWithPassword: vi.fn(), signUp: vi.fn(), signInWithOAuth: vi.fn(),
    },
    from: vi.fn(() => ({
      select: () => ({ eq: (_c: string, id: string) => ({
        single: async () => (state.users[id]
          ? { data: state.users[id].profile, error: null } : { data: null, error: { message: 'introuvable' } }),
      }) }),
    })),
    rpc: vi.fn(),
  }
  return { state, fake, emit, mk }
})
vi.mock('../src/lib/supabase', () => ({ supabase: h.fake, isConfigured: true }))

import { AuthProvider, useAuth } from '../src/context/AuthContext'

const profile = (id: string, role: string, name: string) =>
  ({ id, email: `${id.toLowerCase()}@x.ma`, full_name: name, role })
const acct = (id: string, role: string, name: string, n = 1): StoredAccount =>
  ({ userId: id, email: `${id.toLowerCase()}@x.ma`, name, role: role as any, access_token: `at-${id}-${n}`, refresh_token: `rt-${id}-${n}` })

const stored = () => JSON.parse(window.localStorage.getItem('qellebli_accounts') ?? '[]') as StoredAccount[]

let qc: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={qc}><AuthProvider>{children}</AuthProvider></QueryClientProvider>
)

/** A (RH) est connecté ; A et B (candidat) sont mémorisés ; C (direction) existe sans être mémorisé. */
function scenario(opts: { signedIn?: boolean } = {}) {
  h.state.users = {
    A: { profile: profile('A', 'rh', 'Nadia RH') },
    B: { profile: profile('B', 'candidat', 'Yasmine') },
    C: { profile: profile('C', 'direction', 'Karim') },
  }
  window.localStorage.setItem('qellebli_accounts', JSON.stringify([acct('A', 'rh', 'Nadia RH'), acct('B', 'candidat', 'Yasmine')]))
  h.state.current = opts.signedIn === false ? null : h.mk('A', 1)
}

beforeEach(() => {
  window.localStorage.clear()
  h.state.listeners.length = 0; h.state.n = 1; h.state.current = null; h.state.users = {}
  vi.clearAllMocks()
  qc = new QueryClient()
})
afterEach(cleanup)

describe('comptes mémorisés (stockage)', () => {
  it('upsert remplace à la même place, sinon ajoute', () => {
    const a = acct('A', 'rh', 'A'); const b = acct('B', 'candidat', 'B')
    const l1 = upsertAccount([a, b], { ...a, access_token: 'neuf' })
    expect(l1.map((x) => x.userId)).toEqual(['A', 'B']); expect(l1[0].access_token).toBe('neuf')
    expect(upsertAccount([a], b).map((x) => x.userId)).toEqual(['A', 'B'])
  })
  it('garde au plus 6 comptes (supprime les plus anciens)', () => {
    let l: StoredAccount[] = []
    for (let i = 0; i < 8; i++) l = upsertAccount(l, acct(`U${i}`, 'candidat', `U${i}`))
    expect(l).toHaveLength(6); expect(l[0].userId).toBe('U2')
  })
  it('removeAccount retire uniquement le compte visé', () => {
    expect(removeAccount([acct('A', 'rh', 'A'), acct('B', 'candidat', 'B')], 'A').map((x) => x.userId)).toEqual(['B'])
  })
  it('loadAccounts ignore un stockage corrompu ou des entrées invalides', () => {
    window.localStorage.setItem('qellebli_accounts', '{pas du json')
    expect(loadAccounts()).toEqual([])
    window.localStorage.setItem('qellebli_accounts', JSON.stringify([acct('A', 'rh', 'A'), { userId: 1 }, 'x', null]))
    expect(loadAccounts().map((x) => x.userId)).toEqual(['A'])
  })
})

describe('changer d\'espace', () => {
  it('bascule vers un autre compte sans mot de passe et charge son rôle', async () => {
    scenario()
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.profile?.id).toBe('A'))

    let err: string | null = 'x'
    await act(async () => { err = await result.current.switchAccount('B') })
    expect(err).toBeNull()
    expect(h.fake.auth.setSession).toHaveBeenCalledWith({ access_token: 'at-B-1', refresh_token: 'rt-B-1' })
    expect(h.fake.auth.signOut).not.toHaveBeenCalled()
    await waitFor(() => expect(result.current.profile?.role).toBe('candidat'))
    expect(result.current.session?.user.id).toBe('B')
  })

  it('enregistre les jetons renouvelés des deux comptes', async () => {
    scenario()
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.profile?.id).toBe('A'))
    h.state.current = h.mk('A', 7) // jetons de A renouvelés entre-temps
    await act(async () => { await result.current.switchAccount('B') })
    await waitFor(() => expect(result.current.profile?.id).toBe('B'))
    const list = stored()
    expect(list.find((x) => x.userId === 'A')?.refresh_token).toBe('rt-A-7')   // A conserve ses derniers jetons
    expect(list.find((x) => x.userId === 'B')?.refresh_token).not.toBe('rt-B-1') // B a reçu des jetons neufs
    expect(list).toHaveLength(2)
  })

  it('vide le cache de données quand on change de compte (aucune donnée de l\'ancien espace)', async () => {
    scenario()
    const spy = vi.spyOn(qc, 'clear')
    qc.setQueryData(['rh-applications'], [{ secret: 'donnée RH' }])
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.profile?.id).toBe('A'))
    expect(spy).not.toHaveBeenCalled()
    await act(async () => { await result.current.switchAccount('B') })
    await waitFor(() => expect(result.current.profile?.id).toBe('B'))
    expect(spy).toHaveBeenCalled()
    expect(qc.getQueryData(['rh-applications'])).toBeUndefined()
  })

  it('pas de profil de l\'ancien compte pendant la bascule', async () => {
    scenario()
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.profile?.id).toBe('A'))
    act(() => { h.emit('SIGNED_IN', h.mk('B', 5)); h.state.current = h.mk('B', 5) })
    expect(result.current.profile).toBeNull()
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.profile?.id).toBe('B'))
  })

  it('session expirée : le compte est retiré de la liste et l\'utilisateur reste connecté sur l\'actuel', async () => {
    scenario()
    h.state.users.B.revoked = true
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.profile?.id).toBe('A'))
    let err: string | null = null
    await act(async () => { err = await result.current.switchAccount('B') })
    expect(err).toMatch(/expiré/)
    expect(stored().map((x) => x.userId)).toEqual(['A'])
    expect(result.current.session?.user.id).toBe('A')
  })

  it('basculer vers le compte déjà actif ne fait rien', async () => {
    scenario()
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.profile?.id).toBe('A'))
    let err: string | null = 'x'
    await act(async () => { err = await result.current.switchAccount('A') })
    expect(err).toBeNull(); expect(h.fake.auth.setSession).not.toHaveBeenCalled()
  })

  it('compte inconnu : message d\'erreur', async () => {
    scenario()
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.profile?.id).toBe('A'))
    let err: string | null = null
    await act(async () => { err = await result.current.switchAccount('Z') })
    expect(err).toBe('Compte introuvable.')
  })
})

describe('mémorisation et déconnexion', () => {
  it('mémorise le compte actif une fois son profil chargé (nom, rôle)', async () => {
    h.state.users = { C: { profile: profile('C', 'direction', 'Karim') } }
    h.state.current = h.mk('C', 1)
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.profile?.id).toBe('C'))
    await waitFor(() => expect(stored().find((x) => x.userId === 'C')?.role).toBe('direction'))
    expect(stored()[0].name).toBe('Karim')
  })

  it('met à jour les jetons mémorisés quand ils sont renouvelés', async () => {
    scenario()
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.profile?.id).toBe('A'))
    act(() => { h.state.current = h.mk('A', 99); h.emit('TOKEN_REFRESHED', h.mk('A', 99)) })
    expect(stored().find((x) => x.userId === 'A')?.refresh_token).toBe('rt-A-99')
  })

  it('un renouvellement de jeton du même compte ne vide pas le cache', async () => {
    scenario()
    const spy = vi.spyOn(qc, 'clear')
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.profile?.id).toBe('A'))
    act(() => { h.emit('TOKEN_REFRESHED', h.mk('A', 50)) })
    expect(spy).not.toHaveBeenCalled()
  })

  it('première connexion (personne avant) : pas de vidage inutile', async () => {
    scenario({ signedIn: false })
    const spy = vi.spyOn(qc, 'clear')
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { h.state.current = h.mk('A', 2); h.emit('SIGNED_IN', h.mk('A', 2)) })
    await waitFor(() => expect(result.current.profile?.id).toBe('A'))
    expect(spy).not.toHaveBeenCalled()
  })

  it('déconnexion : oublie le compte actif, garde les autres, vide le cache', async () => {
    scenario()
    const spy = vi.spyOn(qc, 'clear')
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.profile?.id).toBe('A'))
    await act(async () => { await result.current.signOut() })
    expect(h.fake.auth.signOut).toHaveBeenCalledTimes(1)
    expect(stored().map((x) => x.userId)).toEqual(['B'])
    expect(result.current.profile).toBeNull()
    expect(spy).toHaveBeenCalled()
  })

  it('oublier un compte le retire sans déconnecter personne', async () => {
    scenario()
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.profile?.id).toBe('A'))
    act(() => { result.current.forgetAccount('B') })
    expect(stored().map((x) => x.userId)).toEqual(['A'])
    expect(h.fake.auth.signOut).not.toHaveBeenCalled()
    expect(result.current.session?.user.id).toBe('A')
  })
})
