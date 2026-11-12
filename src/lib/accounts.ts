import type { Role } from './constants'

/** Compte mémorisé sur cet appareil pour passer d'un espace à l'autre sans ressaisir le mot de passe. */
export interface StoredAccount {
  userId: string
  email: string
  name: string
  role: Role
  access_token: string
  refresh_token: string
}

const KEY = 'qellebli_accounts'
const MAX_ACCOUNTS = 6

function isAccount(x: unknown): x is StoredAccount {
  if (typeof x !== 'object' || x === null) return false
  const a = x as Record<string, unknown>
  return ['userId', 'email', 'name', 'role', 'access_token', 'refresh_token'].every((k) => typeof a[k] === 'string')
}

export function loadAccounts(): StoredAccount[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isAccount) : []
  } catch {
    return []
  }
}

export function saveAccounts(list: StoredAccount[]): void {
  try {
    if (list.length === 0) window.localStorage.removeItem(KEY)
    else window.localStorage.setItem(KEY, JSON.stringify(list))
  } catch { /* stockage indisponible : les comptes ne seront pas mémorisés */ }
}

/** Remplace le compte s'il existe (même position), sinon l'ajoute ; garde au plus MAX_ACCOUNTS comptes. */
export function upsertAccount(list: StoredAccount[], acc: StoredAccount): StoredAccount[] {
  const next = list.some((a) => a.userId === acc.userId)
    ? list.map((a) => (a.userId === acc.userId ? acc : a))
    : [...list, acc]
  return next.slice(-MAX_ACCOUNTS)
}

export const removeAccount = (list: StoredAccount[], userId: string): StoredAccount[] =>
  list.filter((a) => a.userId !== userId)
