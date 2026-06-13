import { useState, useCallback } from 'react'
import PublicSite from './components/PublicSite.jsx'
import Dashboard from './components/Dashboard.jsx'
import LoginModal from './components/LoginModal.jsx'
import Toast from './components/Toast.jsx'

export default function App() {
  const [user, setUser]         = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [toasts, setToasts]     = useState([])

  const addToast = useCallback((title, msg, type = 'ok') => {
    const id = Date.now()
    setToasts(t => [...t, { id, title, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500)
  }, [])

  const logout = () => { setUser(null); addToast('Logged out', '', 'info') }

  if (user) return (
    <>
      <Dashboard user={user} logout={logout} addToast={addToast} />
      <Toast toasts={toasts} />
    </>
  )

  return (
    <>
      <PublicSite openLogin={() => setShowLogin(true)} addToast={addToast} />
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onLogin={u => { setUser(u); setShowLogin(false); addToast('Welcome back, ' + u.name.split(' ')[0] + '!', 'Logged in as ' + u.role + '.') }}
          addToast={addToast}
        />
      )}
      <Toast toasts={toasts} />
    </>
  )
}
