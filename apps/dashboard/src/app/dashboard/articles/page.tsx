'use client'
import { useEffect, useState, useRef } from 'react'
import api from '@/lib/api'

export default function ArticlesPage() {
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedArticle, setSelectedArticle] = useState<any>(null)
  const isMountedRef = useRef(true)
  const selectedArticleRef = useRef<any>(null)
  selectedArticleRef.current = selectedArticle

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchArticles = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true)
      } else {
        setIsSyncing(true)
      }
      const params = new URLSearchParams()
      params.append('page', String(page))
      params.append('limit', '10')
      if (statusFilter !== 'ALL') params.append('status', statusFilter)

      const res = await api.get(`/api/articles?${params.toString()}`)
      if (!isMountedRef.current) return

      const newArticles = res.data.data || []
      setArticles(newArticles)
      setTotalPages(res.data.pagination?.pages || 1)

      // Automatically keep modal updated if user has an article open
      if (selectedArticleRef.current) {
        const found = newArticles.find((a: any) => a.id === selectedArticleRef.current.id)
        if (found) setSelectedArticle(found)
      }
    } catch (err) {
      console.error('Auto-sync articles error:', err)
    } finally {
      if (isMountedRef.current) {
        if (!silent) setLoading(false)
        setIsSyncing(false)
      }
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    fetchArticles()

    // Background auto-refresh every 5 seconds so newly generated articles appear in real-time
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchArticles(true)
      }
    }, 5000)

    const handleSync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchArticles(true)
      }
    }

    window.addEventListener('focus', handleSync)
    document.addEventListener('visibilitychange', handleSync)

    return () => {
      isMountedRef.current = false
      clearInterval(interval)
      window.removeEventListener('focus', handleSync)
      document.removeEventListener('visibilitychange', handleSync)
    }
  }, [statusFilter, page])

  const [publishingId, setPublishingId] = useState<string | null>(null)

  const handlePublish = async (id: string, title: string) => {
    if (!confirm(`Publikasikan artikel "${title}" sekarang ke website?`)) return
    try {
      setPublishingId(id)
      const res = await api.post(`/api/articles/${id}/publish`)
      alert(res.data.message || 'Artikel berhasil dipublikasikan ke website!')
      fetchArticles()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mempublikasikan artikel. Periksa koneksi website & API Key di Pengaturan.')
    } finally {
      setPublishingId(null)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Hapus artikel "${title}"?`)) return
    try {
      await api.delete(`/api/articles/${id}`)
      fetchArticles()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus')
    }
  }

  const filteredArticles = articles.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    (a.keywords && a.keywords.some((k: string) => k.toLowerCase().includes(search.toLowerCase())))
  )

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'badge-success'
      case 'FAILED': return 'badge-danger'
      case 'PENDING': return 'badge-warning'
      default: return 'badge-info'
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>📝 Daftar Artikel</h1>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              fontSize: '0.75rem', 
              fontWeight: 500,
              color: '#34d399', 
              background: 'rgba(16, 185, 129, 0.12)', 
              border: '1px solid rgba(16, 185, 129, 0.3)', 
              padding: '0.25rem 0.65rem', 
              borderRadius: 999 
            }}>
              <span style={{ 
                width: 7, 
                height: 7, 
                borderRadius: '50%', 
                backgroundColor: isSyncing ? '#38bdf8' : '#10b981', 
                boxShadow: isSyncing ? '0 0 8px #38bdf8' : '0 0 6px #10b981',
                display: 'inline-block',
                transition: 'all 0.3s ease'
              }} />
              {isSyncing ? 'Menyinkronkan...' : 'Auto-Sync Aktif'}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Daftar konten diperbarui secara otomatis setiap beberapa detik tanpa perlu refresh halaman manual.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            onClick={() => fetchArticles(false)} 
            className="btn btn-outline" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.95rem' }}
            title="Segarkan artikel sekarang"
          >
            🔄 Segarkan
          </button>
          <a href="/dashboard/generate" className="btn btn-primary">
            ✨ Buat Artikel Baru
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Cari artikel berdasarkan judul atau keyword..."
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['ALL', 'PUBLISHED', 'DRAFT', 'PENDING', 'FAILED'].map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem' }}
              >
                {s === 'ALL' ? 'Semua' : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Articles Table */}
      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Memuat daftar artikel...
          </div>
        ) : filteredArticles.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Tidak ada artikel yang sesuai.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Cover</th>
                <th>Judul Artikel</th>
                <th>Keywords Target</th>
                <th>Status</th>
                <th>Waktu</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredArticles.map(a => (
                <tr key={a.id}>
                  <td>
                    {a.imageUrl ? (
                      <img
                        src={a.imageUrl}
                        alt="thumb"
                        style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <div style={{ width: 56, height: 40, background: 'var(--surface-2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                        📄
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{a.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {a.excerpt?.slice(0, 80)}...
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {a.keywords?.slice(0, 3).map((k: string, idx: number) => (
                        <span key={idx} style={{ background: 'var(--surface-2)', padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.725rem', color: 'var(--accent-light)' }}>
                          #{k}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${statusBadgeClass(a.status)}`}>
                      {a.status}
                    </span>
                    {a.errorLog && a.status !== 'PUBLISHED' && (
                      <div style={{ fontSize: '0.7rem', color: '#f87171', marginTop: '0.25rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.errorLog}>
                        ⚠️ {a.errorLog}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(a.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      {a.status !== 'PUBLISHED' && (
                        <button
                          onClick={() => handlePublish(a.id, a.title)}
                          disabled={publishingId === a.id}
                          className="btn btn-primary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          {publishingId === a.id ? '⏳ Mengirim...' : '🚀 Publikasikan'}
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedArticle(a)}
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        👁️ Preview
                      </button>
                      {a.cmsPostUrl && (
                        <a
                          href={a.cmsPostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          🔗 CMS
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(a.id, a.title)}
                        className="btn btn-danger"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              ← Prev
            </button>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Hal {page} dari {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {selectedArticle && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 760 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <span className={`badge ${statusBadgeClass(selectedArticle.status)}`} style={{ marginBottom: '0.5rem' }}>
                  {selectedArticle.status}
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{selectedArticle.title}</h2>
              </div>
              <button onClick={() => setSelectedArticle(null)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem' }}>✕</button>
            </div>

            {selectedArticle.imageUrl && (
              <img
                src={selectedArticle.imageUrl}
                alt="Header"
                style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 12, marginBottom: '1.25rem' }}
              />
            )}

            <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: 10, marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>EXCERPT:</div>
              <p>{selectedArticle.excerpt}</p>
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selectedArticle.keywords?.map((k: string, i: number) => (
                  <span key={i} className="badge badge-info" style={{ fontSize: '0.7rem' }}>#{k}</span>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--accent-light)' }}>
                Konten HTML Rendered:
              </h3>
              <div
                style={{ color: 'var(--text)', lineHeight: 1.7, fontSize: '0.9rem' }}
                dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button onClick={() => setSelectedArticle(null)} className="btn btn-primary">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
