import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { homeForRole } from './lib/constants'
import { isConfigured } from './lib/supabase'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Spinner from './components/Spinner'
import Login from './pages/Login'
import Register from './pages/Register'
import NotFound from './pages/NotFound'
import ConfigMissing from './pages/ConfigMissing'
import CandidatHome from './pages/candidat/Home'
import CandidatProfile from './pages/candidat/Profile'
import CandidatOffers from './pages/candidat/Offers'
import OfferDetail from './pages/candidat/OfferDetail'
import Applications from './pages/candidat/Applications'
import RhHome from './pages/rh/Home'
import RhOffers from './pages/rh/Offers'
import OfferForm from './pages/rh/OfferForm'
import RhApplications from './pages/rh/Applications'
import ApplicationReview from './pages/rh/ApplicationReview'
import Compare from './pages/rh/Compare'
import Pipeline from './pages/rh/Pipeline'
import Interviews from './pages/rh/Interviews'
import InterviewForm from './pages/rh/InterviewForm'
import InterviewDetail from './pages/rh/InterviewDetail'
import DirectionHome from './pages/direction/Home'
import Statistics from './pages/direction/Statistics'

function RootRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (session && profile) return <Navigate to={homeForRole(profile.role)} replace />
  return <Navigate to="/connexion" replace />
}

export default function App() {
  if (!isConfigured) return <ConfigMissing />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/connexion" element={<Login />} />
        <Route path="/inscription" element={<Register />} />

        <Route element={<ProtectedRoute allow={['candidat']} />}>
          <Route path="/candidat" element={<Layout />}>
            <Route index element={<CandidatHome />} />
            <Route path="profil" element={<CandidatProfile />} />
            <Route path="offres" element={<CandidatOffers />} />
            <Route path="offres/:id" element={<OfferDetail />} />
            <Route path="candidatures" element={<Applications />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allow={['rh']} />}>
          <Route path="/rh" element={<Layout />}>
            <Route index element={<RhHome />} />
            <Route path="offres" element={<RhOffers />} />
            <Route path="offres/nouvelle" element={<OfferForm />} />
            <Route path="offres/:id" element={<OfferForm />} />
            <Route path="candidatures" element={<RhApplications />} />
            <Route path="candidatures/:id" element={<ApplicationReview />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="comparaison" element={<Compare />} />
            <Route path="entretiens" element={<Interviews />} />
            <Route path="entretiens/nouveau" element={<InterviewForm />} />
            <Route path="entretiens/:id" element={<InterviewDetail />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allow={['direction']} />}>
          <Route path="/direction" element={<Layout />}>
            <Route index element={<DirectionHome />} />
            <Route path="statistiques" element={<Statistics />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
