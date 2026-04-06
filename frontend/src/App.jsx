import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import DashboardPage from './pages/DashboardPage'
import EmployeesPage from './pages/EmployeesPage'
import RecruitmentPage from './pages/RecruitmentPage'
import LeavesPage from './pages/LeavesPage'
import PerformancePage from './pages/PerformancePage'
import OnboardingPage from './pages/OnboardingPage'
import AnalyticsPage from './pages/AnalyticsPage'
import OrgChartPage from './pages/OrgChartPage'
import OfferLettersPage from './pages/OfferLettersPage'

function PrivateRoute({ children, adminOnly = false }) {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.must_change_password) return <Navigate to="/change-password" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return children
}

function ChangePasswordRoute() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <ChangePasswordPage />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ChangePasswordRoute />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="employees" element={<PrivateRoute adminOnly><EmployeesPage /></PrivateRoute>} />
            <Route path="org-chart" element={<OrgChartPage />} />
            <Route path="recruitment" element={<PrivateRoute adminOnly><RecruitmentPage /></PrivateRoute>} />
            <Route path="leaves" element={<LeavesPage />} />
            <Route path="performance" element={<PerformancePage />} />
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route path="analytics" element={<PrivateRoute adminOnly><AnalyticsPage /></PrivateRoute>} />
            <Route path="offer-letters" element={<PrivateRoute adminOnly><OfferLettersPage /></PrivateRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
