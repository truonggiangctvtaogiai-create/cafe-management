import { AuthProvider, useAuth } from './auth'
import { LoginPage } from './pages/LoginPage'
import { MainApp } from './MainApp'

function AppContent() {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-logo">☕</div>
        <div className="login-subtitle">Đang tải...</div>
      </div>
    )
  }

  if (!profile) return <LoginPage />
  return <MainApp />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
