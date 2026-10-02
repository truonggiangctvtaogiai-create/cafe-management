import React, { useState } from 'react'
import { useAuth } from '../auth'

export function LoginPage() {
  const { signIn } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(username.trim(), password)
    if (error) setError(error)
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-logo">☕</div>
      <div className="login-title">Quản Lý Quán Cà Phê</div>
      <div className="login-subtitle">Đăng nhập để tiếp tục</div>
      <form className="login-card" onSubmit={handleSubmit}>
        {error && <div className="login-error">{error}</div>}
        <div className="login-field">
          <label className="login-label">Tài khoản</label>
          <input
            className="login-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin hoặc nhanvien"
            autoFocus
          />
        </div>
        <div className="login-field">
          <label className="login-label">Mật khẩu</label>
          <input
            className="login-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
          />
        </div>
        <button className="login-btn" type="submit" disabled={loading}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
      <div className="login-hint">
        Tài khoản demo:<br />
        <code>admin</code> / <code>admin123</code> (Quản trị viên)<br />
        <code>nhanvien</code> / <code>123</code> (Nhân viên)
      </div>
    </div>
  )
}
