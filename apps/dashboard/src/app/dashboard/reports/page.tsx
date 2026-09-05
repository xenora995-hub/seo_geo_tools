'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import api from '@/lib/api'

function ReportsContent() {
  const [reports, setReports] = useState<any[]>([])
  const [rankings, setRankings] = useState<any[]>([])
  const [aiVisibility, setAiVisibility] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [crawling, setCrawling] = useState(false)
  const [sendingReport, setSendingReport] = useState<string | null>(null)
  const [notification, setNotification] = useState('')
  const searchParams = useSearchParams()

  const fetchData = async () => {
    try {
      setLoading(true)
      // Extract tenantId from URL
      const tenantIdStr = searchParams.get('tenantId')
      const query = tenantIdStr ? `?tenantId=${tenantIdStr}` : ''

      const [repRes, rankRes, aiRes] = await Promise.all([
        api.get(`/api/reports${query}`).catch(() => ({ data: { data: [] } })),
        api.get(`/api/crawler/rankings${query}`).catch(() => ({ data: { data: [] } })),
        api.get(`/api/crawler/ai-visibility${query}`).catch(() => ({ data: { data: [] } })),
      ])

      setReports(repRes.data?.data || [])
      setRankings(rankRes.data?.data || [])
      setAiVisibility(aiRes.data?.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSendReport = async (type: 'daily' | 'weekly') => {
    setSendingReport(type)
    setNotification('')
    try {
      const tenantIdStr = searchParams.get('tenantId')
      const query = tenantIdStr ? `?tenantId=${tenantIdStr}` : ''
      const endpoint = type === 'daily' ? `/api/reports/send-daily${query}` : `/api/reports/send-weekly${query}`
      const res = await api.post(endpoint)
      setNotification(`✅ ${res.data.message || 'Laporan berhasil dikirim ke Telegram!'}`)
      fetchData()
    } catch (err: any) {
      setNotification(`❌ ${err.response?.data?.message || 'Gagal mengirim laporan. Pastikan Bot Token & Chat ID Telegram sudah diisi di Pengaturan.'}`)
    } finally {
      setSendingReport(null)
    }
  }

  const handleRunCrawler = async () => {
    setCrawling(true)
    setNotification('')
    try {
      const tenantIdStr = searchParams.get('tenantId')
      const query = tenantIdStr ? `?tenantId=${tenantIdStr}` : ''
      const res = await api.post(`/api/crawler/run${query}`)
      setRankings(res.data.data?.rankings || [])
      setAiVisibility(res.data.data?.visibility || [])
      setNotification('✅ Pengecekan ranking Google & AI Search selesai diperbarui!')
    } catch (err: any) {
      setNotification(`❌ ${err.response?.data?.message || 'Gagal menjalankan crawler'}`)
    } finally {
      setCrawling(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>📊 Laporan & Analitik GEO/SEO</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Pantau performa ranking Google SERP, visibilitas di search AI (ChatGPT/Perplexity), dan riwayat laporan Telegram
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => handleSendReport('daily')}
            disabled={sendingReport !== null}
            className="btn btn-outline"
          >
            {sendingReport === 'daily' ? 'Mengirim...' : '✈️ Kirim Lap. Harian'}
          </button>
          <button
            onClick={() => handleSendReport('weekly')}
            disabled={sendingReport !== null}
            className="btn btn-outline"
          >
            {sendingReport === 'weekly' ? 'Mengirim...' : '📊 Kirim Lap. Mingguan'}
          </button>
          <button
            onClick={handleRunCrawler}
            disabled={crawling}
            className="btn btn-primary"
          >
            {crawling ? 'Memeriksa...' : '🔄 Cek Ranking Sekarang'}
          </button>
        </div>
      </div>

      {notification && (
        <div style={{
          background: notification.startsWith('✅') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${notification.startsWith('✅') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: notification.startsWith('✅') ? '#34d399' : '#fca5a5',
          padding: '1rem', borderRadius: 10, marginBottom: '1.5rem', fontSize: '0.875rem'
        }}>
          {notification}
        </div>
      )}

      {/* Grid: Google Ranking + AI Search Visibility */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Google SERP Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🔍 Status Google SERP Ranking
            </h2>
            <span className="badge badge-info">{rankings.length} Keyword</span>
          </div>

          {rankings.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
              Belum ada target keyword. Isi target keyword di halaman <strong>Pengaturan</strong>.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {rankings.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.keyword}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {r.url ? <a href={r.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-light)' }}>{r.url}</a> : 'URL belum terindeks'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: r.position && r.position <= 10 ? 'var(--success)' : 'var(--text)' }}>
                      #{r.position ?? '>100'}
                    </div>
                    <span className={`badge ${r.inFirstPage ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                      {r.inFirstPage ? 'Halaman 1' : `Hal ${r.page || '-'}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Search Visibility Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🤖 Visibilitas AI Search (GEO)
            </h2>
            <span className="badge badge-info">ChatGPT & Perplexity</span>
          </div>

          {aiVisibility.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
              Belum ada data visibilitas AI. Klik <strong>Cek Ranking Sekarang</strong> di atas.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {aiVisibility.map((v, i) => (
                <div key={i} style={{ padding: '0.85rem', background: 'var(--surface-2)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{v.keyword}</span>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <span className={`badge ${v.appearsInChatGpt ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                        ChatGPT: {v.appearsInChatGpt ? 'Ya' : 'Belum'}
                      </span>
                      <span className={`badge ${v.appearsInPerplexity ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                        Perplexity: {v.appearsInPerplexity ? 'Ya' : 'Belum'}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {v.aiSummary}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reports History */}
      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>📜 Riwayat Laporan Telegram yang Terkirim</h2>
        </div>

        {reports.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Belum ada laporan yang dikirimkan. Laporan akan otomatis terkirim setiap hari jam 23:00 dan mingguan hari Minggu jam 08:00, atau gunakan tombol di atas untuk trigger manual.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipe Laporan</th>
                <th>Waktu Pengiriman</th>
                <th>Ringkasan Data</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(rep => (
                <tr key={rep.id}>
                  <td>
                    <span className={`badge ${rep.type === 'DAILY' ? 'badge-info' : 'badge-success'}`}>
                      {rep.type === 'DAILY' ? 'HARIAN' : 'MINGGUAN'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {new Date(rep.sentAt).toLocaleString('id-ID')}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    <code style={{ background: 'var(--surface-2)', padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.75rem' }}>
                      {JSON.stringify(rep.data)}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Memuat Laporan SEO...</div>}>
      <ReportsContent />
    </Suspense>
  )
}
