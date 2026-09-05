'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import api from '@/lib/api'



function SchedulesContent() {
  const searchParams = useSearchParams()
  const tenantIdQuery = searchParams.get('tenantId')

  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showBackdateModal, setShowBackdateModal] = useState(false)
  const [backdateTarget, setBackdateTarget] = useState<any>(null)
  const [backdateForm, setBackdateForm] = useState({ date: '' })
  const [runningBackdate, setRunningBackdate] = useState(false)

  const [form, setForm] = useState({
    name: '',
    scheduleType: 'daily',
    time: '08:00',
    cronExpr: '0 8 * * *',
    topic: '',
    startDate: '',
    endDate: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchSchedules = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const query = tenantIdQuery ? `?tenantId=${tenantIdQuery}` : ''
      const res = await api.get(`/api/schedules${query}`)
      setSchedules(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchedules()

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchSchedules(true)
      }
    }, 10000)

    const handleSync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchSchedules(true)
      }
    }

    window.addEventListener('focus', handleSync)
    document.addEventListener('visibilitychange', handleSync)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleSync)
      document.removeEventListener('visibilitychange', handleSync)
    }
  }, [tenantIdQuery])

  const handleTimeChange = (newTime: string) => {
    if (!newTime) return
    const [hours, minutes] = newTime.split(':')
    const cron = `${parseInt(minutes)} ${parseInt(hours)} * * *`
    setForm({ ...form, time: newTime, cronExpr: cron })
  }

  const handleTypeChange = (type: string) => {
    if (type === 'daily') {
      const [hours, minutes] = form.time.split(':')
      const cron = `${parseInt(minutes)} ${parseInt(hours)} * * *`
      setForm({ ...form, scheduleType: 'daily', cronExpr: cron })
    } else {
      setForm({ ...form, scheduleType: 'custom' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const query = tenantIdQuery ? `?tenantId=${tenantIdQuery}` : ''
      let endIso = null
      if (form.endDate) {
        const d = new Date(form.endDate)
        d.setHours(23, 59, 59, 999)
        endIso = d.toISOString()
      }

      const payload = {
        name: form.name,
        cronExpr: form.cronExpr,
        topic: form.topic || undefined,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: endIso,
      }

      if (editingId) {
        await api.patch(`/api/schedules/${editingId}${query}`, payload)
      } else {
        await api.post(`/api/schedules${query}`, payload)
      }
      setShowModal(false)
      setEditingId(null)
      setForm({ name: '', scheduleType: 'daily', time: '08:00', cronExpr: '0 8 * * *', topic: '', startDate: '', endDate: '' })
      fetchSchedules()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal membuat jadwal')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStatus = async (id: string, currentActive: boolean) => {
    try {
      const query = tenantIdQuery ? `?tenantId=${tenantIdQuery}` : ''
      await api.patch(`/api/schedules/${id}${query}`, { isActive: !currentActive })
      fetchSchedules()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal memperbarui jadwal')
    }
  }

  const handleBackdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!backdateForm.date) return alert('Pilih tanggal backdate terlebih dahulu!')
    setRunningBackdate(true)
    try {
      const query = tenantIdQuery ? `?tenantId=${tenantIdQuery}` : ''
      await api.post(`/api/schedules/trigger/${backdateTarget.id}${query}`, { 
        publishDate: new Date(backdateForm.date).toISOString() 
      })
      setShowBackdateModal(false)
      alert('Artikel backdate berhasil di-generate dan di-publish ke CMS!')
      fetchSchedules()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal memicu jadwal')
    } finally {
      setRunningBackdate(false)
    }
  }

  const handleEdit = (s: any) => {
    setEditingId(s.id)
    
    // Coba parsing cronExpr ke time jika formatnya "M H * * *"
    let isDaily = false
    let timeStr = '08:00'
    const parts = s.cronExpr.split(' ')
    if (parts.length === 5 && parts[2] === '*' && parts[3] === '*' && parts[4] === '*' && !parts[0].includes(',') && !parts[1].includes(',')) {
      isDaily = true
      const mins = parts[0].padStart(2, '0')
      const hrs = parts[1].padStart(2, '0')
      timeStr = `${hrs}:${mins}`
    }

    setForm({
      name: s.name,
      scheduleType: isDaily ? 'daily' : 'custom',
      time: timeStr,
      cronExpr: s.cronExpr,
      topic: s.topic || '',
      startDate: s.startDate ? new Date(s.startDate).toISOString().split('T')[0] : '',
      endDate: s.endDate ? new Date(s.endDate).toISOString().split('T')[0] : ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus jadwal "${name}"?`)) return
    try {
      const query = tenantIdQuery ? `?tenantId=${tenantIdQuery}` : ''
      await api.delete(`/api/schedules/${id}${query}`)
      fetchSchedules()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus jadwal')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>🕐 Robot Penulis (Jadwal Otomatis)</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Tugaskan robot AI untuk menulis dan memposting artikel ke website Anda secara otomatis.
          </p>
        </div>
        <button onClick={() => { setEditingId(null); setForm({ name: '', scheduleType: 'daily', time: '08:00', cronExpr: '0 8 * * *', topic: '', startDate: '', endDate: '' }); setShowModal(true) }} className="btn btn-primary">
          ➕ Tambah Jadwal Baru
        </button>
      </div>

      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Memuat daftar jadwal...
          </div>
        ) : schedules.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Belum ada jadwal posting otomatis. Klik <strong>Tambah Jadwal Baru</strong> untuk mulai.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Jadwal</th>
                <th>Kode Waktu</th>
                <th>Topik Khusus</th>
                <th>Masa Aktif</th>
                <th>Status</th>
                <th>Terakhir Jalan</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>
                    <code style={{ background: 'var(--surface-2)', padding: '0.2rem 0.5rem', borderRadius: 6, color: 'var(--accent-light)' }}>
                      {s.cronExpr}
                    </code>
                  </td>
                  <td style={{ color: s.topic ? 'var(--text)' : 'var(--text-muted)' }}>
                    {s.topic || 'Auto (berdasarkan keyword setting)'}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {s.startDate || s.endDate ? (
                      <>
                        <div>Mulai: {s.startDate ? new Date(s.startDate).toLocaleDateString('id-ID') : '-'}</div>
                        <div>Selesai: {s.endDate ? new Date(s.endDate).toLocaleDateString('id-ID') : '-'}</div>
                      </>
                    ) : (
                      'Selamanya'
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => toggleStatus(s.id, s.isActive)}
                      className={`badge ${s.isActive ? 'badge-success' : 'badge-danger'}`}
                      style={{ cursor: 'pointer', border: 'none' }}
                      title="Klik untuk toggle status aktif"
                    >
                      {s.isActive ? '● Aktif' : '○ Nonaktif'}
                    </button>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {s.lastRun ? new Date(s.lastRun).toLocaleString('id-ID') : 'Belum pernah'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                      <button
                        onClick={() => handleEdit(s)}
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => { setBackdateTarget(s); setShowBackdateModal(true); setBackdateForm({ date: '' }) }}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        title="Tarik mundur tanggal dan jalankan langsung (Backdate)"
                      >
                        ✨ Backdate
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="btn btn-danger"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        🗑️ Hapus
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{editingId ? 'Edit Jadwal Posting' : 'Buat Jadwal Posting Baru'}</h2>
              <button onClick={() => { setShowModal(false); setEditingId(null); }} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem' }}>✕</button>
            </div>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem' }}>
                ❌ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Nama Jadwal</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Auto Post Pagi Hari"
                  required
                />
              </div>

              <div>
                <label>Jenis Jadwal</label>
                <select
                  value={form.scheduleType}
                  onChange={e => handleTypeChange(e.target.value)}
                >
                  <option value="daily">Waktu Khusus (Setiap Hari)</option>
                  <option value="custom">Advanced (Kode Cron)</option>
                </select>
              </div>

              {form.scheduleType === 'daily' ? (
                <div>
                  <label>Pilih Jam (Waktu menyesuaikan Zona Waktu di Setting)</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => handleTimeChange(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div>
                  <label>Kode Waktu (Cron Expression)</label>
                  <input
                    value={form.cronExpr}
                    onChange={e => setForm({ ...form, cronExpr: e.target.value })}
                    placeholder="Contoh: 0 8 * * *"
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gunakan * * * * * untuk test setiap menit.</span>
                </div>
              )}

              <div>
                <label>Topik Khusus <span style={{ color: 'var(--text-muted)' }}>(Opsional — Jika kosong, robot akan mencari ide sendiri dari target keyword)</span></label>
                <input
                  value={form.topic}
                  onChange={e => setForm({ ...form, topic: e.target.value })}
                  placeholder="Contoh: Perkembangan teknologi AI di Indonesia"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>Tanggal Mulai <span style={{ color: 'var(--text-muted)' }}>(Opsional)</span></label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label>Tanggal Selesai <span style={{ color: 'var(--text-muted)' }}>(Opsional)</span></label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                    Kosongkan jika ingin berjalan terus setiap hari.
                  </span>
                </div>
              </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }} className="btn btn-outline">Batal</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Menyimpan...' : 'Simpan Jadwal'}
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBackdateModal && backdateTarget && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Tarik Mundur (Backdate)</h2>
              <button onClick={() => setShowBackdateModal(false)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem' }} disabled={runningBackdate}>✕</button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Anda akan menjalankan jadwal <strong>"{backdateTarget.name}"</strong> secara paksa sekarang, dan menyetel tanggal publikasinya ke tanggal di masa lalu. Cocok untuk menambal lubang jadwal yang terlewat.
            </p>

            <form onSubmit={handleBackdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Pilih Tanggal Masa Lalu</label>
                <input
                  type="date"
                  className="input"
                  value={backdateForm.date}
                  onChange={(e) => setBackdateForm({ date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]} // tidak boleh masa depan
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowBackdateModal(false)} className="btn btn-outline" disabled={runningBackdate}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={runningBackdate || !backdateForm.date}>
                  {runningBackdate ? '⏳ Memproses & Posting...' : '🚀 Jalankan Backdate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SchedulesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SchedulesContent />
    </Suspense>
  )
}
