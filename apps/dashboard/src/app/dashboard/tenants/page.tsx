'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    name: '',
    domain: '',
    cmsType: 'WORDPRESS',
    cmsUrl: '',
    cmsApiKey: '',
    language: 'id',
    adminEmail: '',
    adminPassword: '',
    adminName: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fetchError, setFetchError] = useState('')

  const fetchTenants = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/api/tenants')
      setTenants(res.data.data || [])
      setFetchError('')
    } catch (err: any) {
      console.error(err)
      if (!silent || tenants.length === 0) {
        setFetchError(err.response?.data?.message || 'Gagal terhubung ke Backend API (502/Down).')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchTenants()

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchTenants(true)
      }
    }, 6000)

    const handleSync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchTenants(true)
      }
    }

    window.addEventListener('focus', handleSync)
    document.addEventListener('visibilitychange', handleSync)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleSync)
      document.removeEventListener('visibilitychange', handleSync)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/api/tenants', form)
      setShowModal(false)
      setForm({
        name: '', domain: '', cmsType: 'WORDPRESS', cmsUrl: '', cmsApiKey: '',
        language: 'id', adminEmail: '', adminPassword: '', adminName: ''
      })
      fetchTenants()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menambahkan tenant')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStatus = async (id: string, currentActive: boolean) => {
    try {
      await api.patch(`/api/tenants/${id}`, { isActive: !currentActive })
      fetchTenants()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengubah status')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus website "${name}"? Semua artikel & jadwal terkait akan ikut terhapus.`)) return
    try {
      await api.delete(`/api/tenants/${id}`)
      fetchTenants()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus tenant')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>🌐 Kelola Website (Tenants)</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Multi-tenant management: pantau dan kelola seluruh website klien yang terhubung
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          ➕ Tambah Website Baru
        </button>
      </div>

      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Memuat daftar website...
          </div>
        ) : fetchError ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: '#f87171', fontWeight: 600, marginBottom: '0.5rem' }}>⚠️ {fetchError}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Backend API pada port 4000 sedang offline atau dalam proses restart.
            </p>
            <button onClick={() => fetchTenants(false)} className="btn btn-outline" style={{ display: 'inline-block' }}>
              🔄 Coba Muat Ulang
            </button>
          </div>
        ) : tenants.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Belum ada website klien terdaftar. Klik <strong>Tambah Website Baru</strong> di atas.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Website</th>
                <th>Domain</th>
                <th>CMS Type</th>
                <th>Bahasa</th>
                <th>Artikel</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td>
                    <a href={t.cmsUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-light)' }}>
                      {t.domain} ↗
                    </a>
                  </td>
                  <td>
                    <span className={`badge ${t.cmsType === 'WORDPRESS' ? 'badge-info' : 'badge-warning'}`}>
                      {t.cmsType}
                    </span>
                  </td>
                  <td>{t.language.toUpperCase()}</td>
                  <td>{t._count?.articles ?? 0} post</td>
                  <td>
                    <button
                      onClick={() => toggleStatus(t.id, t.isActive)}
                      className={`badge ${t.isActive ? 'badge-success' : 'badge-danger'}`}
                      style={{ cursor: 'pointer', border: 'none' }}
                      title="Klik untuk toggle status aktif"
                    >
                      {t.isActive ? '● Aktif' : '○ Nonaktif'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                      <a href={`/dashboard/generate?tenantId=${t.id}`} className="btn btn-outline" title="Buat Artikel Manual" style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', borderColor: 'var(--accent)', color: 'var(--accent-light)', whiteSpace: 'nowrap' }}>
                        ✨ Tulis
                      </a>
                      <a href={`/dashboard/schedules?tenantId=${t.id}`} className="btn btn-outline" title="Jadwal Otomatis" style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        🕐 Jadwal
                      </a>
                      <a href={`/dashboard/settings?tenantId=${t.id}`} className="btn btn-outline" title="Pengaturan Website" style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        ⚙️ Setting
                      </a>
                      <button onClick={() => handleDelete(t.id, t.name)} className="btn btn-danger" title="Hapus Website" style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Tambah Website Klien Baru</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem' }}>✕</button>
            </div>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem' }}>
                ❌ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>Nama Website</label>
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Contoh: Web Bisnis Pro"
                    required
                  />
                </div>
                <div>
                  <label>Domain</label>
                  <input
                    value={form.domain}
                    onChange={e => setForm({ ...form, domain: e.target.value })}
                    placeholder="contohbisnis.com"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>Tipe CMS</label>
                  <select
                    value={form.cmsType}
                    onChange={e => setForm({ ...form, cmsType: e.target.value })}
                  >
                    <option value="WORDPRESS">WordPress (REST API)</option>
                    <option value="LARAVEL">Laravel (Custom API)</option>
                    <option value="BLOGGER">Blogger (Blogspot)</option>
                  </select>
                </div>
                <div>
                  <label>Bahasa Konten</label>
                  <select
                    value={form.language}
                    onChange={e => setForm({ ...form, language: e.target.value })}
                  >
                    <option value="id">Bahasa Indonesia</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div>
                <label>CMS URL</label>
                <input
                  value={form.cmsUrl}
                  onChange={e => setForm({ ...form, cmsUrl: e.target.value })}
                  placeholder="https://contohbisnis.com"
                  required
                />
              </div>

              <div>
                <label>CMS API Key / App Password</label>
                <input
                  value={form.cmsApiKey}
                  onChange={e => setForm({ ...form, cmsApiKey: e.target.value })}
                  placeholder="Base64 user:app_password (WP) atau Bearer token (Laravel)"
                  required
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Akun Admin Tenant (Opsional):
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label>Email Admin</label>
                    <input
                      type="email"
                      value={form.adminEmail}
                      onChange={e => setForm({ ...form, adminEmail: e.target.value })}
                      placeholder="admin@contohbisnis.com"
                    />
                  </div>
                  <div>
                    <label>Password Admin</label>
                    <input
                      type="password"
                      value={form.adminPassword}
                      onChange={e => setForm({ ...form, adminPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan Website'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
