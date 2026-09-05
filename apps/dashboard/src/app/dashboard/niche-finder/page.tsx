'use client'
import { useState, Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import api from '@/lib/api'

function NicheFinderContent() {
  const searchParams = useSearchParams()
  const [region, setRegion] = useState('indonesia') // 'indonesia' or 'global'
  const [baseKeyword, setBaseKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [niches, setNiches] = useState<any[]>([])
  const [claimedNiches, setClaimedNiches] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // Auto-fill baseKeyword with businessNiche from settings if available
  useEffect(() => {
    const fetchTenantNiche = async () => {
      try {
        const userStr = localStorage.getItem('user')
        const localTenantId = userStr ? JSON.parse(userStr).tenantId : null
        const tenantId = searchParams.get('tenantId') || localTenantId
        if (!tenantId) return

        const res = await api.get(`/api/settings?tenantId=${tenantId}`)
        if (res.data?.data?.businessNiche) {
          setBaseKeyword(res.data.data.businessNiche)
        }
      } catch (err) {
        console.error('Failed to fetch default business niche:', err)
      }
    }
    fetchTenantNiche()
  }, [searchParams])

  const discoverNiches = async () => {
    setLoading(true)
    setError(null)
    try {
      const userStr = localStorage.getItem('user')
      const localTenantId = userStr ? JSON.parse(userStr).tenantId : null
      const tenantId = searchParams.get('tenantId') || localTenantId

      if (!tenantId) {
        throw new Error('Anda belum memiliki Website. Silakan ke menu "Kelola Website" dan buat website baru terlebih dahulu agar sistem memiliki tempat untuk menyimpan pengaturan API Key Anda.')
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/niche-finder/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, region, baseKeyword })
      })
      
      const data = await res.json()
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Terjadi kesalahan saat mencari niche.')
      }

      setNiches(data.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async (nicheName: string) => {
    try {
      const userStr = localStorage.getItem('user')
      const localTenantId = userStr ? JSON.parse(userStr).tenantId : null
      const tenantId = searchParams.get('tenantId') || localTenantId

      if (!tenantId) {
        throw new Error('Tenant ID tidak ditemukan.')
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/niche-finder/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, name: nicheName })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal klaim niche')

      setClaimedNiches(prev => [...prev, nicheName])
    } catch (err: any) {
      alert(err.message)
    }
  }

  const getCpcBadge = (level: string) => {
    const l = level.toLowerCase()
    if (l.includes('sangat tinggi')) return 'bg-purple-100 text-purple-700 border-purple-200'
    if (l.includes('tinggi')) return 'bg-green-100 text-green-700 border-green-200'
    return 'bg-blue-100 text-blue-700 border-blue-200'
  }

  const getCompetitionBadge = (comp: string) => {
    const c = comp.toLowerCase()
    if (c.includes('rendah')) return 'bg-green-100 text-green-700 border-green-200'
    if (c.includes('sedang')) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-red-100 text-red-700 border-red-200'
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>💡 AdSense Niche Finder</h1>
        <p style={{ color: 'var(--text-muted)' }}>Temukan topik blog yang menguntungkan, minim saingan, dan cocok untuk mendulang dollar dari Google AdSense dengan bantuan AI.</p>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontWeight: 600 }}>Target Pasar:</span>
            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--surface-2)', padding: '0.25rem', borderRadius: '8px' }}>
              <button
                onClick={() => setRegion('indonesia')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  background: region === 'indonesia' ? 'var(--primary)' : 'transparent',
                  color: region === 'indonesia' ? '#fff' : 'var(--text-muted)'
                }}
              >
                🇮🇩 Indonesia (Lokal)
              </button>
              <button
                onClick={() => setRegion('global')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  background: region === 'global' ? 'var(--primary)' : 'transparent',
                  color: region === 'global' ? '#fff' : 'var(--text-muted)'
                }}
              >
                🌎 Global (USA)
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Topik / Kata Kunci Dasar (Opsional)</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <input
                  type="text"
                  value={baseKeyword}
                  onChange={(e) => setBaseKeyword(e.target.value)}
                  placeholder="Contoh: Bengkel Mobil, Wisata Bali, Resep Ayam..."
                  className="input"
                  style={{ width: '100%' }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Otomatis diisi dari Pengaturan Anda. Kosongkan jika Anda ingin ide niche acak.
                </p>
              </div>
              <button
                onClick={discoverNiches}
                disabled={loading}
                className="btn btn-primary"
                style={{ height: '42px', minWidth: '200px', flexShrink: 0, justifyContent: 'center' }}
              >
                {loading ? '⏳ Memproses...' : '✨ Temukan Niche Emas'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-8">
          <strong>Gagal: </strong> {error}
        </div>
      )}
      
      {/* Results Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {niches.map((niche, idx) => (
          <div key={idx} className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{
                    display: 'inline-flex', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                    background: idx === 0 ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255,255,255,0.05)',
                    color: idx === 0 ? '#fde047' : 'var(--text-muted)',
                    border: `1px solid ${idx === 0 ? 'rgba(234, 179, 8, 0.4)' : 'rgba(255,255,255,0.1)'}`
                  }}>
                    {idx === 0 ? '🏆 Paling Direkomendasikan (#1)' : `Peringkat #${idx + 1}`}
                  </span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.5rem' }}>{niche.name}</h2>
                  
                  {niche.blogName && niche.blogAddress && (
                    <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <strong style={{ color: 'var(--text)' }}>Ide Blog:</strong> <span style={{ color: 'var(--text-secondary)' }}>{niche.blogName}</span> <br />
                      <strong style={{ color: 'var(--text)' }}>URL:</strong> <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--accent-light)' }}>{niche.blogAddress}</span>
                    </div>
                  )}
                </div>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '1rem' }}>{niche.description}</p>
              
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>
                  💰 CPC: {niche.cpcLevel}
                </div>
                <div style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>
                  ⚔️ Saingan: {niche.competition}
                </div>
              </div>
              
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text)' }}>Target Audiens:</strong> {niche.targetAudience}
              </div>
            </div>
            
            <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.15)' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Ide Kata Kunci (Long-tail)</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {niche.longTailKeywords?.map((kw: string, i: number) => (
                    <span key={i} style={{ padding: '0.25rem 0.5rem', background: 'var(--surface-2)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
              
              <button 
                onClick={() => handleClaim(niche.name)}
                disabled={claimedNiches.includes(niche.name)}
                className={`btn ${claimedNiches.includes(niche.name) ? 'btn-outline' : 'btn-secondary'}`}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {claimedNiches.includes(niche.name) ? '✅ Sudah Anda Klaim' : '🏆 Claim Niche Ini'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {!loading && niches.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: '12px' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🤖</span>
          <p>Tekan tombol "Temukan Niche Emas" untuk membiarkan AI menganalisis data tren pencarian.</p>
        </div>
      )}

    </div>
  )
}

export default function NicheFinderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NicheFinderContent />
    </Suspense>
  )
}
