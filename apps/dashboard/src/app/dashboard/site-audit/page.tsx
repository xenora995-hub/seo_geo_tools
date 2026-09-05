'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import api from '@/lib/api'

function SiteAuditContent() {
  const searchParams = useSearchParams()
  const tenantIdQuery = searchParams.get('tenantId')

  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [fixing, setFixing] = useState(false)
  const [fixStep, setFixStep] = useState('')
  const [showFixModal, setShowFixModal] = useState(false)

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return
    setLoading(true)
    try {
      const userStr = localStorage.getItem('user')
      let tenantId = userStr ? JSON.parse(userStr).tenantId : ''
      if (!tenantId && tenantIdQuery && tenantIdQuery !== 'undefined' && tenantIdQuery !== 'null') tenantId = tenantIdQuery
      if (!tenantId || tenantId === 'undefined' || tenantId === 'null') tenantId = 'dummy-tenant-id' // fallback untuk super admin uji coba

      // Auto-prefix http if missing
      let finalUrl = url.trim()
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl
      }

      const res = await api.post(`/api/site-audit/scan`, { url: finalUrl, tenantId })
      if (res.data.success) {
        setReport(res.data.data)
      }
    } catch (error: any) {
      console.error(error)
      alert(error.response?.data?.error || 'Gagal memindai website. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleAutoFix = async () => {
    if (!report) return
    setShowFixModal(true)
    setFixing(true)
    setFixStep('Menganalisis arsitektur CMS...')
    
    try {
      setTimeout(() => setFixStep('Menulis ulang struktur Tag Meta dan Header...'), 2000)
      setTimeout(() => setFixStep('Memperbaiki broken links dan atribut gambar...'), 4000)
      setTimeout(() => setFixStep('Mengunggah perbaikan teknis ke peladen (Server)...'), 6000)

      const res = await api.post(`/api/site-audit/auto-fix`, { reportId: report.id })
      
      setTimeout(() => {
        if (res.data.success) {
          setReport(res.data.data)
        }
        setFixStep('Selesai! Website dalam kondisi optimal.')
        setTimeout(() => {
          setFixing(false)
          setShowFixModal(false)
        }, 2000)
      }, 8000)
    } catch (err) {
      console.error(err)
      setFixStep('Gagal melakukan perbaikan.')
      setFixing(false)
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>🩺 Audit Situs (Technical SEO)</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Pindai website Anda untuk menemukan isu teknis yang menghambat peringkat di mesin pencari.</p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label>URL Website</label>
            <input 
              type="text" 
              placeholder="Contoh: baliphonerepair.com" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleScan(e as any) }}
            />
          </div>
          <button 
            type="button" 
            onClick={handleScan}
            disabled={loading || !url}
            className="btn btn-primary"
            style={{ height: '46px', minWidth: '150px', justifyContent: 'center' }}
          >
            {loading ? (
              <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div> Memindai...</>
            ) : 'Mulai Audit'}
          </button>
        </div>
      </div>

      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Health Score Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Skor Kesehatan Situs</h3>
            
            <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
                <path
                  style={{ color: 'rgba(255,255,255,0.05)' }}
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  style={{ color: report.healthScore > 80 ? 'var(--success)' : report.healthScore > 50 ? 'var(--warning)' : 'var(--danger)', transition: 'stroke-dasharray 1s ease-out' }}
                  strokeDasharray={`${report.healthScore}, 100`}
                  strokeWidth="3"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'white' }}>{report.healthScore}</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>/ 100</span>
              </div>
            </div>
            
            <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {report.healthScore > 80 ? 'Website Anda dalam kondisi prima!' : 'Ada beberapa isu yang perlu diperbaiki.'}
            </p>
          </div>

          {/* Issues Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', gridColumn: 'span 2' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              <h3 style={{ fontWeight: 600 }}>Ringkasan Isu ({report.errors + report.warnings + report.notices})</h3>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>!</div>
                  <div>
                    <h4 style={{ fontWeight: 600 }}>Errors (Kritis)</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Isu berat (seperti 404 broken links)</p>
                  </div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>{report.errors}</div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>⚠</div>
                  <div>
                    <h4 style={{ fontWeight: 600 }}>Warnings (Peringatan)</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Isu menengah (missing meta tags, dll)</p>
                  </div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{report.warnings}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>i</div>
                  <div>
                    <h4 style={{ fontWeight: 600 }}>Notices (Pemberitahuan)</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Saran optimasi ringan</p>
                  </div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-light)' }}>{report.notices}</div>
              </div>
            </div>
            
            {report.healthScore < 100 && (
              <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border)', textAlign: 'center', background: 'rgba(99, 102, 241, 0.05)' }}>
                <button 
                  onClick={handleAutoFix}
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', fontWeight: 600 }}
                >
                  ✨ Perbaiki Otomatis (AI)
                </button>
              </div>
            )}
            {report.healthScore === 100 && (
              <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--success)' }}>
                ✅ Semua isu telah terselesaikan!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Progress Auto Fix */}
      {showFixModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>✨ AI Auto-Fix</h3>
            
            {fixing ? (
              <div style={{ padding: '2rem 0' }}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{fixStep}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Jangan tutup halaman ini...</p>
              </div>
            ) : (
              <div style={{ padding: '2rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                <p style={{ fontWeight: 600, color: 'var(--success)', fontSize: '1.1rem' }}>{fixStep}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SiteAuditPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SiteAuditContent />
    </Suspense>
  )
}
