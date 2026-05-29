import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PopManagementPage from './pages/PopManagementPage'
import UserManagementPage from './pages/UserManagementPage'
import { checkAuthentication } from './api'

export default function App() {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    async function initializeAuth() {
      const me = await checkAuthentication()
      setUser(me)
      setAuthChecked(true)
    }
    initializeAuth()
  }, [])

  if (!authChecked) {
    return <div className="loading-overlay">Memuat aplikasi...</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginPage onLogin={setUser} />}
        />
        <Route
          path="/users"
          element={user ? <UserManagementPage user={user} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/pop-management"
          element={user ? <PopManagementPage user={user} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/"
          element={user ? <DashboardPage user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
