'use client'
import React, { useState, useEffect, Suspense, Fragment } from 'react'
import { useSearchParams } from 'next/navigation'

function BacklinksContent() {
  const searchParams = useSearchParams()
  const tenantIdQuery = searchParams.get('tenantId')

  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState<any[]>([])
  const [activeTutorial, setActiveTutorial] = useState<string | null>(null)
  
  const getTenantId = () => {
    const userStr = localStorage.getItem('user')
    let tenantId = userStr ? JSON.parse(userStr).tenantId : ''
    if (!tenantId && tenantIdQuery && tenantIdQuery !== 'undefined' && tenantIdQuery !== 'null') tenantId = tenantIdQuery
    if (!tenantId || tenantId === 'undefined' || tenantId === 'null') tenantId = 'dummy-tenant-id'
    return tenantId
  }

  const loadTasks = async () => {
    try {
      const tenantId = getTenantId()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/backlinks/tasks?tenantId=${tenantId}`)
      const result = await res.json()
      if (result.success) {
        setTasks(result.data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [tenantIdQuery])

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!domain) return
    setLoading(true)
    try {
      const tenantId = getTenantId()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/backlinks/analyze?domain=${domain}&tenantId=${tenantId}`)
      const result = await res.json()
      if (result.success) {
        await loadTasks() // Refresh tasks from DB
        setDomain('') // Clear form
        alert('Berhasil! Peluang backlink baru telah ditambahkan ke Buku Tugas Anda di bawah.')
      } else {
        alert(result.error || 'Terjadi kesalahan saat menganalisis.')
      }
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'Gagal menghubungi server.')
    } finally {
      setLoading(false)
    }
  }

  const toggleTaskStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'DONE' ? 'PENDING' : 'DONE'
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/backlinks/tasks/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      const result = await res.json()
      if (result.success) {
        setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t))
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>🔗 Campaign Manager (GEO)</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Cari peluang baru dan kelola daftar tugas penyebaran Backlink / Brand Mention Anda.</p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Cari Peluang Baru</h2>
        <form onSubmit={handleAnalyze} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label>Domain / URL</label>
            <input 
              type="text" 
              placeholder="website.com" 
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary"
            style={{ height: '46px', minWidth: '150px', justifyContent: 'center' }}
          >
            {loading ? 'Menganalisis AI...' : 'Temukan Peluang'}
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 600 }}>📋 Buku Tugas Backlink Saya</h3>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total: {tasks.length} Tugas</span>
        </div>
        
        {tasks.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Belum ada tugas. Silakan cari peluang baru di atas!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem', width: '50px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '1rem', fontWeight: 500 }}>Target Platform</th>
                  <th style={{ padding: '1rem', fontWeight: 500, textAlign: 'center' }}>DR</th>
                  <th style={{ padding: '1rem', fontWeight: 500 }}>Strategi GEO</th>
                  <th style={{ padding: '1rem', fontWeight: 500, textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task: any) => (
                  <Fragment key={task.id}>
                    <tr style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s', opacity: task.status === 'DONE' ? 0.6 : 1 }}>
                      <td style={{ padding: '1rem', textAlign: 'center', verticalAlign: 'top' }}>
                        <input 
                          type="checkbox" 
                          checked={task.status === 'DONE'}
                          onChange={() => toggleTaskStatus(task.id, task.status)}
                          style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer', accentColor: 'var(--primary)' }}
                        />
                      </td>
                      <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.25rem' }}>
                          <a href={task.targetUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                            {task.targetUrl.replace(/^https?:\/\/(www\.)?/, '')} ↗
                          </a>
                        </div>
                        <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: 4, color: 'var(--text-muted)' }}>
                          {task.category}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', verticalAlign: 'top' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 999, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                          {task.domainRating}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                        <p style={{ fontSize: '0.875rem', lineHeight: 1.5, margin: 0, color: 'var(--text-muted)' }}>
                          {task.strategy}
                        </p>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', verticalAlign: 'top' }}>
                        {task.tutorial && task.tutorial.length > 0 && (
                          <button 
                            onClick={() => setActiveTutorial(activeTutorial === task.id ? null : task.id)}
                            style={{ 
                              background: 'transparent', 
                              border: '1px solid var(--primary)', 
                              color: 'var(--primary)', 
                              padding: '0.35rem 0.75rem', 
                              borderRadius: '4px', 
                              fontSize: '0.75rem', 
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {activeTutorial === task.id ? 'Tutup Tutorial' : 'Lihat Tutorial'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {activeTutorial === task.id && task.tutorial && (
                      <tr style={{ background: 'rgba(99, 102, 241, 0.05)', borderBottom: '1px solid var(--border)' }}>
                        <td colSpan={5} style={{ padding: '1.5rem' }}>
                          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>💡</span> AI Tutorial: Cara Eksekusi
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {task.tutorial.map((step: string, idx: number) => (
                              <div key={idx} style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
                                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{idx + 1}.</span>
                                <span style={{ color: 'var(--foreground)' }}>{step.replace(/^\d+\.\s*/, '')}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function BacklinksPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BacklinksContent />
    </Suspense>
  )
}
