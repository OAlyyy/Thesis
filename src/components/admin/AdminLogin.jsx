import { useState } from 'react'
import { supabase } from '../../services/supabase'

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authError) {
      setError('Invalid credentials.')
    } else {
      onLogin()
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <h2 style={styles.title}>Admin Login</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: '#f4f4f5',
  },
  box: {
    background: '#fff', borderRadius: 12, padding: '2.5rem 2rem',
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)', minWidth: 320,
  },
  title: {
    margin: '0 0 1.5rem', fontSize: '1.4rem', fontWeight: 700,
    textAlign: 'center', color: '#18181b',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  input: {
    padding: '0.65rem 0.9rem', borderRadius: 7, fontSize: '1rem',
    border: '1px solid #d1d5db', outline: 'none',
  },
  error: { color: '#ef4444', fontSize: '0.875rem', margin: 0 },
  button: {
    padding: '0.7rem', borderRadius: 7, background: '#2563eb',
    color: '#fff', border: 'none', fontSize: '1rem',
    fontWeight: 600, cursor: 'pointer', marginTop: 4,
  },
}
