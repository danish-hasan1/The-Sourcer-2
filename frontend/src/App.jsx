import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import SourcePage from './pages/SourcePage'
import PipelinePage from './pages/PipelinePage'
import SavedJDsPage from './pages/SavedJDsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import UsersPage from './pages/UsersPage'
import CandidatePage from './pages/CandidatePage'

function ProtectedRoute({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"       element={<LandingPage />} />
      <Route path="/login"  element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* App — protected */}
      <Route path="/app" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard"      element={<DashboardPage />} />
        <Route path="source"         element={<SourcePage />} />
        <Route path="source/:id"     element={<SourcePage />} />
        <Route path="pipeline"       element={<PipelinePage />} />
        <Route path="saved-jds"      element={<SavedJDsPage />} />
        <Route path="reports"        element={<ReportsPage />} />
        <Route path="settings"       element={<SettingsPage />} />
        <Route path="users"          element={<UsersPage />} />
        <Route path="candidates/:id" element={<CandidatePage />} />
      </Route>
    </Routes>
  )
}
