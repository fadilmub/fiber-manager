import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkAuthentication, login } from '../api'

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function verify() {
      const user = await checkAuthentication()
      if (user) {
        onLogin?.(user)
        navigate('/', { replace: true })
      }
    }
    verify()
  }, [navigate, onLogin])

  async function submitLogin(event) {
    event.preventDefault()
    setError('')

    if (!username || !password) {
      setError('Username dan password harus diisi')
      return
    }

    setLoading(true)
    try {
      const response = await login(username.trim(), password)
      if (response && response.user) {
        onLogin?.(response.user)
        navigate('/', { replace: true })
      } else {
        setError(response?.error || 'Username atau password salah')
      }
    } catch (err) {
      setError('Gagal terhubung ke server. Pastikan backend berjalan.')
    } finally {
      setLoading(false)
    }
  }

  function togglePasswordVisibility() {
    setShowPassword(prev => !prev)
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <i className="fas fa-network-wired login-icon" />
          <h1>Fiber Manager</h1>
          <p>Sistem Manajemen ODP & ODC</p>
        </div>

        <form className="login-form" onSubmit={submitLogin}>
          <div className="form-group">
            <label htmlFor="username">
              <i className="fas fa-user" /> Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Masukkan username"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <i className="fas fa-lock" /> Password
            </label>
            <div className="password-input">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
                autoComplete="current-password"
              />
              <button type="button" className="toggle-password" onClick={togglePasswordVisibility}>
                <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} />
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-login" disabled={loading}>
            <i className={loading ? 'fas fa-spinner fa-spin' : 'fas fa-sign-in-alt'} />
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2024 Fiber Manager. All rights reserved.</p>
          <p style={{ marginTop: 5, fontSize: 11 }}>Default: admin/password</p>
        </div>
      </div>
    </div>
  )
}
