'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function ContentGapContent() {
  const searchParams = useSearchParams()
  const tenantIdQuery = searchParams.get('tenantId')

  const [myDomain, setMyDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!myDomain) return
    
    setLoading(true)
    
    try {
      const userStr = localStorage.getItem('user')
      let tenantId = userStr ? JSON.parse(userStr).tenantId : ''
      if (!tenantId && tenantIdQuery && tenantIdQuery !== 'undefined' && tenantIdQuery !== 'null') tenantId = tenantIdQuery
      if (!tenantId || tenantId === 'undefined' || tenantId === 'null') tenantId = 'dummy-tenant-id'

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/content-gap/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ myDomain, tenantId })
      })
      const data = await res.json()
      if (data.success) {
        setResults(data.data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>🎯 Celah Konten (Content Gap)</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Temukan kata kunci yang mendatangkan trafik ke kompetitor Anda, tetapi Anda belum memiliki kontennya.</p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleCompare} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label>Domain Anda</label>
            <input 
              type="text" 
              placeholder="website-saya.com" 
              value={myDomain}
              onChange={(e) => setMyDomain(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary"
            style={{ height: '46px', minWidth: '150px', justifyContent: 'center' }}
          >
            {loading ? '🤖 Menganalisis...' : 'Mulai Analisis AI'}
          </button>
        </form>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
          💡 Sistem AI kami akan secara otomatis menganalisis niche Anda dan mencari 2 kompetitor terbesar Anda di internet.
        </p>
      </div>

      {results.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 600 }}>Peluang Kata Kunci yang Ditemukan</h3>
            <span style={{ fontSize: '0.75rem', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '0.25rem 0.75rem', borderRadius: 999, fontWeight: 600 }}>
              {results.length} Peluang Emas
            </span>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem', fontWeight: 500 }}>Kata Kunci (Keyword)</th>
                  <th style={{ padding: '1rem', fontWeight: 500, textAlign: 'right' }}>Volume</th>
                  <th style={{ padding: '1rem', fontWeight: 500, textAlign: 'center', borderLeft: '1px solid var(--border)' }}>Domain Anda</th>
                  <th style={{ padding: '1rem', fontWeight: 500, textAlign: 'center', borderLeft: '1px solid var(--border)', color: '#fbbf24' }}>
                    {results[0]?.competitors?.[0]?.domain || 'Kompetitor 1'}
                  </th>
                  {results[0]?.competitors?.[1] && (
                    <th style={{ padding: '1rem', fontWeight: 500, textAlign: 'center', borderLeft: '1px solid var(--border)', color: '#fbbf24' }}>
                      {results[0]?.competitors?.[1]?.domain}
                    </th>
                  )}
                  <th style={{ padding: '1rem', fontWeight: 500, textAlign: 'center', borderLeft: '1px solid var(--border)' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s', cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{item.keyword}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>{item.volume.toLocaleString()}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>- (Tidak ada)</span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 999, background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', fontWeight: 600, fontSize: '0.875rem' }}>
                        {item.competitors[0]?.rank}
                      </span>
                    </td>
                    {results[0]?.competitors?.[1] && (
                      <td style={{ padding: '1rem', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 999, background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', fontWeight: 600, fontSize: '0.875rem' }}>
                          {item.competitors[1]?.rank}
                        </span>
                      </td>
                    )}
                    <td style={{ padding: '1rem', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                      <a 
                        href={`/dashboard/generate?keyword=${encodeURIComponent(item.keyword)}${tenantIdQuery ? `&tenantId=${tenantIdQuery}` : ''}`}
                        className="btn btn-outline"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        ✨ Buat Artikel
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ContentGapPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Memuat...</div>}>
      <ContentGapContent />
    </Suspense>
  )
}
