'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault()
    const targetEmail = customEmail || email
    const targetPass = customPass || password

    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/auth/login', { email: targetEmail, password: targetPass })
      localStorage.setItem('token', res.data.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.data.user))
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login gagal. Periksa kembali email dan password.')
    } finally {
      setLoading(false)
    }
  }

  const fillCredentials = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail)
    setPassword(rolePass)
    handleLogin(undefined, roleEmail, rolePass)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(ellipse at top, rgba(99, 102, 241, 0.15), var(--bg) 70%)'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 440, padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            fontSize: '1.75rem',
            marginBottom: '1rem',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)'
          }}>
            🚀
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>SEO & GEO Tools</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.35rem' }}>
            Masuk untuk mengelola automasi konten & ranking AI
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div>
            <label>Email Akun</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nama@domain.com"
              required
            />
          </div>
          <div>
            <label>Kata Sandi</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 10,
              padding: '0.75rem 1rem',
              color: '#fca5a5',
              fontSize: '0.825rem'
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Memverifikasi...' : 'Masuk ke Dashboard →'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '0.75rem' }}>
            Akses Cepat (Demo Akun):
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => fillCredentials('admin@seogeo.com', 'Admin@2024!')}
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '0.5rem', justifyContent: 'center' }}
            >
              ⭐ Superuser
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('admin@democlient.com', 'DemoPassword123!')}
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '0.5rem', justifyContent: 'center' }}
            >
              🌐 Client Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
