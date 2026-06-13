import { useState } from 'react'
import Modal, { ModalHead } from './Modal.jsx'
import { db } from '../supabaseClient.js'

export default function LoginModal({ onClose, onLogin, addToast }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await db.staff()
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .eq('password', password)
      .single()
    setLoading(false)
    if (error || !data) { addToast('Login failed', 'Incorrect username or password.', 'err'); return }
    onLogin(data)
  }

  return (
    <Modal onClose={onClose}>
      <ModalHead title="Staff & Admin login" onClose={onClose} />
      <div className="modal-body">
        <p className="muted" style={{ marginBottom: 16, fontSize: '.91rem' }}>
          For Admin and Moderator accounts only. Guests don't need to log in to book.
        </p>
        <form onSubmit={submit}>
          <div className="field">
            <label>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required autoComplete="username" placeholder="admin" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Log in'}
          </button>
        </form>
        <div className="login-hint" style={{ marginTop: 14 }}>
          Default admin — <b>admin</b> / <b>goaircon2025</b>
        </div>
      </div>
    </Modal>
  )
}
