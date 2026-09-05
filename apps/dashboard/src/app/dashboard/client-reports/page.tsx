'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import api from '@/lib/api'

function ClientReportsContent() {
  const [loading, setLoading] = useState(true)
  const [googleWins, setGoogleWins] = useState<any[]>([])
  const [aiWins, setAiWins] = useState<any[]>([])
  const [domain, setDomain] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const u = JSON.parse(userStr)
          if (u.tenant && u.tenant.domain) {
            setDomain(u.tenant.domain)
          } else {
             // Fetch from API to get the current tenant domain
             const res = await api.get('/api/tenants')
             if (res.data?.data && res.data.data.length > 0) {
               const queryTenantId = searchParams.get('tenantId')
               
               if (queryTenantId) {
                 const matchedTenant = res.data.data.find((t: any) => t.id === queryTenantId)
                 if (matchedTenant) setDomain(matchedTenant.domain)
                 else setDomain(res.data.data[0].domain)
               } else {
                 setDomain(res.data.data[0].domain)
               }
             }
          }
        }
        
        // Extract tenantId from URL
        const tenantIdStr = searchParams.get('tenantId')
        const query = tenantIdStr ? `?tenantId=${tenantIdStr}` : ''

        const [rankRes, aiRes] = await Promise.all([
          api.get(`/api/crawler/rankings${query}`).catch(() => ({ data: { data: [] } })),
          api.get(`/api/crawler/ai-visibility${query}`).catch(() => ({ data: { data: [] } })),
        ])

        // Filter Google Page 1 wins (Position 1-10)
        const rawRankings = rankRes.data?.data || []
        const p1 = rawRankings.filter((r: any) => r.inFirstPage || (r.position && r.position <= 10))
        setGoogleWins(p1)

        // Filter AI Search wins (ChatGPT or Perplexity)
        const rawAi = aiRes.data?.data || []
        const aiW = rawAi.filter((v: any) => v.appearsInChatGpt || v.appearsInPerplexity)
        setAiWins(aiW)

      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const generateReportText = () => {
    const webName = domain || 'Website Anda'
    let text = `Halo Bapak/Ibu,\nBerikut adalah laporan perkembangan optimasi SEO website ${webName} bulan ini.\n\n`
    
    if (googleWins.length > 0) {
      text += `*Website Anda kini berhasil menguasai Halaman 1 Google untuk kata kunci pencarian berikut:*\n`
      googleWins.forEach(r => {
        text += `- "${r.keyword}" (Posisi #${r.position})\n`
      })
      text += `\n`
    }

    if (aiWins.length > 0) {
      text += `*Selain itu, website Anda juga sudah direkomendasikan oleh AI (ChatGPT/Perplexity) untuk pencarian GEO berikut:*\n`
      aiWins.forEach(v => {
        text += `- "${v.keyword}"\n`
      })
      text += `\n`
    }

    text += `Silakan Bapak/Ibu buktikan sendiri dengan mengetikkan kata-kata kunci di atas di Google atau ChatGPT. Terima kasih atas kepercayaannya! 🚀`
    return text
  }

  const handleCopy = () => {
    const text = generateReportText()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Memuat data kemenangan keyword...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>💌 Laporan Keyword Klien</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem', maxWidth: '600px' }}>
            Halaman ini khusus menampilkan keyword yang sudah sukses masuk Halaman 1 Google & AI Search. Salin laporan ini untuk dikirimkan ke klien Anda.
          </p>
        </div>
        <button 
          onClick={handleCopy}
          className={`btn ${copied ? 'btn-success' : 'btn-primary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
        >
          {copied ? '✅ Berhasil Disalin!' : '📋 Salin Teks ke WhatsApp'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexDirection: 'column' }}>
        
        {/* Preview Teks Laporan */}
        <div className="card" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#475569' }}>
            Preview Teks Pesan WhatsApp:
          </h2>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            fontFamily: 'inherit', 
            fontSize: '0.9rem', 
            lineHeight: 1.6, 
            color: '#334155' 
          }}>
            {generateReportText()}
          </pre>
        </div>

        {/* Tabel Rincian */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🥇 SEO: Halaman 1 Google
            </h3>
            {googleWins.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>Belum ada keyword di halaman 1.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {googleWins.map((r, idx) => (
                  <div key={idx} style={{ padding: '0.75rem 1rem', background: 'rgba(22, 163, 74, 0.05)', border: '1px solid rgba(22, 163, 74, 0.2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>{r.keyword}</span>
                    <span className="badge badge-success">Posisi #{r.position}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🤖 GEO: AI Search Terdeteksi
            </h3>
            {aiWins.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>Belum ada keyword yang direkomendasikan AI.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {aiWins.map((v, idx) => (
                  <div key={idx} style={{ padding: '0.75rem 1rem', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>{v.keyword}</span>
                    <span className="badge" style={{ background: '#ddd6fe', color: '#5b21b6' }}>Rekomendasi</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

export default function ClientReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Memuat Laporan Klien...</div>}>
      <ClientReportsContent />
    </Suspense>
  )
}
