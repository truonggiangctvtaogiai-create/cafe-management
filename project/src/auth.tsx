import { createContext, useContext, useState, ReactNode } from 'react'
import type { Profile } from './types'

interface AuthContextValue {
  profile: Profile | null
  loading: boolean
  signIn: (username: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const STORAGE_KEY = 'cafe_auth_user'

const ACCOUNTS: Record<string, { password: string; profile: Profile }> = {
  admin: {
    password: 'admin123',
    profile: {
      id: 'a0000000-0000-0000-0000-000000000001',
      username: 'admin',
      role: 'admin',
      display_name: 'Quản trị viên',
      is_active: true,
      created_at: new Date().toISOString(),
    },
  },
  nhanvien: {
    password: '123',
    profile: {
      id: 'a0000000-0000-0000-0000-000000000002',
      username: 'nhanvien',
      role: 'staff',
      display_name: 'Nhân viên',
      is_active: true,
      created_at: new Date().toISOString(),
    },
  },
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) return JSON.parse(stored) as Profile
    } catch { /* ignore */ }
    return null
  })
  const [loading] = useState(false)

  const signIn = async (username: string, password: string) => {
    const account = ACCOUNTS[username]
    if (!account || password !== account.password) {
      return { error: 'Sai tài khoản hoặc mật khẩu' }
    }
    const userProfile = account.profile
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userProfile))
    setProfile(userProfile)
    return { error: null }
  }

  const signOut = async () => {
    localStorage.removeItem(STORAGE_KEY)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
