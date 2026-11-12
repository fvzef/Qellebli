import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, User, Briefcase, FileText, GitCompare, CalendarClock,
  BarChart3, Columns3, LogOut, Menu, X, type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ROLE_LABELS, type Role } from '../lib/constants'
import Logo from './Logo'
import SuggestionLists from './SuggestionLists'
import AccountSwitcher from './AccountSwitcher'

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }

const NAV: Record<Role, NavItem[]> = {
  candidat: [
    { to: '/candidat', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
    { to: '/candidat/profil', label: 'Mon profil', icon: User },
    { to: '/candidat/offres', label: 'Offres', icon: Briefcase },
    { to: '/candidat/candidatures', label: 'Mes candidatures', icon: FileText },
  ],
  rh: [
    { to: '/rh', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
    { to: '/rh/offres', label: 'Offres', icon: Briefcase },
    { to: '/rh/candidatures', label: 'Candidatures', icon: FileText },
    { to: '/rh/pipeline', label: 'Pipeline', icon: Columns3 },
    { to: '/rh/comparaison', label: 'Comparaison', icon: GitCompare },
    { to: '/rh/entretiens', label: 'Entretiens', icon: CalendarClock },
  ],
  direction: [
    { to: '/direction', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
    { to: '/direction/statistiques', label: 'Statistiques', icon: BarChart3 },
  ],
}

export default function Layout() {
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  if (!profile) return null

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5"><Logo /></div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV[profile.role].map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to} to={to} end={end} onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-accent-soft text-accent-dark' : 'text-muted hover:bg-beige-100 hover:text-ink'
              }`}
          >
            <Icon size={18} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-line p-4">
        <p className="truncate text-sm font-medium">{profile.full_name || profile.email}</p>
        <p className="mb-3 text-xs text-muted">{ROLE_LABELS[profile.role]}</p>
        <AccountSwitcher onNavigate={() => setOpen(false)} />
        <button onClick={signOut} className="btn-ghost w-full"><LogOut size={16} /> Déconnexion</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:flex">
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <Logo />
        <button onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><Menu size={22} /></button>
      </header>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-line bg-white lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            <button className="absolute right-3 top-4" onClick={() => setOpen(false)} aria-label="Fermer"><X size={20} /></button>
            {sidebar}
          </aside>
        </div>
      )}

      <SuggestionLists />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><Outlet /></main>
    </div>
  )
}
