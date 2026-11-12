import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeForRole, type Role } from '../lib/constants'
import Spinner from './Spinner'

/** Protège un groupe de routes : connexion obligatoire + rôle autorisé. */
export default function ProtectedRoute({ allow }: { allow: Role[] }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <Spinner />
  if (!session || !profile) return <Navigate to="/connexion" replace />
  if (!allow.includes(profile.role)) return <Navigate to={homeForRole(profile.role)} replace />
  return <Outlet />
}
