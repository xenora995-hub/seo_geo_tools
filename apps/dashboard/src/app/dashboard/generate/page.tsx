'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import api from '@/lib/api'

function GenerateContent() {
  const searchParams = useSearchParams()
  const tenantIdQuery = searchParams.get('tenantId')
  
  const [topic, setTopic] = useState('')
  const [keywords, setKeywords] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [step, setStep] = useState('')
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([])

  // Fetch report data on load to find keyword gaps
  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const url = tenantIdQuery ? `/api/crawler/rankings?tenantId=${tenantIdQuery}` : '/api/crawler/rankings'
        const res = await api.get(url)
        if (res.data?.data) {
          // Find keywords not on page 1 (position > 10 or null)
          const weakKeywords = res.data.data
            .filter((k: any) => k.position === null || k.position > 10)
            .map((k: any) => k.keyword)
          
          if (weakKeywords.length > 0) {
            setSuggestedKeywords(weakKeywords)
            setKeywords(weakKeywords.join(', '))
          }
        }
      } catch (err) {
        console.error("Gagal mengambil laporan SEO", err)
      }
    }
    fetchRankings()
  }, [tenantIdQuery])

  const steps = [
    '🤖 Meminta GPT-4o menulis artikel...',
    '🎨 Membuat gambar dengan DALL-E 3...',
    '📤 Mempublikasikan ke website...',
  ]

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    const keywordList = keywords.split(',').map(k => k.trim()).filter(Boolean)

    // Simulate step progress
    let stepIdx = 0
    const interval = setInterval(() => {
      if (stepIdx < steps.length) { setStep(steps[stepIdx]); stepIdx++ }
    }, 8000)

    try {
      const url = tenantIdQuery ? `/api/generate/article?tenantId=${tenantIdQuery}` : '/api/generate/article'
      const res = await api.post(url, {
        topic: topic || undefined,
        keywords: keywordList.length > 0 ? keywordList : undefined,
      })
      setResult(res.data.data)
      setStep('✅ Selesai!')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal generate artikel')
      setStep('')
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>✨ Buat Artikel (Uji Coba Manual)</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Tulis satu artikel menggunakan AI dan langsung otomatis terposting ke website Anda.
      </p>

      {suggestedKeywords.length > 0 && (
        <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--primary)', borderRadius: '0.5rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem' }}>💡 Rekomendasi Pintar (Dari Laporan SEO Terakhir)</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Ditemukan {suggestedKeywords.length} kata kunci yang belum mencapai Halaman 1 Google. 
            Sistem otomatis menyarankan kata kunci ini agar artikel Anda selanjutnya fokus mengejar ketertinggalan *ranking* untuk: <strong>{suggestedKeywords.join(', ')}</strong>.
          </p>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label>Topik Artikel <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(Opsional - kosongkan agar AI memilih sendiri)</span></label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="Contoh: Panduan lengkap jasa pembuatan website untuk UMKM di Indonesia 2025" />
          </div>
          <div>
            <label>Kata Kunci Tambahan <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(Opsional, pisahkan dengan koma)</span></label>
            <input value={keywords} onChange={e => setKeywords(e.target.value)}
              placeholder="Contoh: jasa web Bali, buat website murah, web developer Indonesia" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
            {loading ? '⏳ Sedang memproses...' : '🚀 Mulai Tulis & Posting'}
          </button>
        </form>

        {loading && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--surface-2)', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 20, height: 20, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{step || 'Memulai...'}</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Proses ini membutuhkan 30-90 detik. Harap tunggu.
            </p>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#7f1d1d', borderRadius: 8, color: '#fca5a5', fontSize: '0.875rem' }}>
            ❌ {error}
          </div>
        )}
      </div>

      {result && (
        <div className="card" style={{ borderLeft: result.article?.status === 'PUBLISHED' ? '4px solid var(--success)' : '4px solid #f59e0b' }}>
          {result.article?.status === 'PUBLISHED' ? (
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--success)', marginBottom: '1rem' }}>
              ✅ Artikel Berhasil Dipublikasikan ke Website!
            </h2>
          ) : (
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f59e0b', marginBottom: '0.5rem' }}>
                ⚠️ Artikel Berhasil Dibuat AI, Namun Belum Tayang di Web (Status: DRAFT)
              </h2>
              <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 8, padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#fef3c7', lineHeight: 1.5 }}>
                {result.message || 'Koneksi ke website gagal (401 Unauthorized). Pastikan API Token / Bearer Token website sudah benar di menu Pengaturan.'}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label>Judul Artikel</label>
              <p style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.2rem' }}>{result.article?.title}</p>
            </div>
            {result.article?.cmsPostUrl ? (
              <div>
                <label>URL Publikasi</label>
                <a href={result.article.cmsPostUrl} target="_blank" rel="noreferrer"
                  style={{ color: 'var(--accent-light)', fontSize: '0.875rem', wordBreak: 'break-all', display: 'inline-block', marginTop: '0.2rem' }}>
                  {result.article.cmsPostUrl} →
                </a>
              </div>
            ) : (
              <div>
                <label>Status di Sistem</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <span className="badge badge-warning" style={{ fontSize: '0.8rem' }}>DRAFT</span>
                  <a href="/dashboard/articles" style={{ fontSize: '0.85rem', color: 'var(--accent-light)', textDecoration: 'underline' }}>
                    Lihat di Menu Daftar Artikel →
                  </a>
                </div>
              </div>
            )}
            {result.article?.imageUrl && (
              <div>
                <label>Gambar Header AI</label>
                <img src={result.article.imageUrl} alt="Header" style={{ width: '100%', borderRadius: 8, maxHeight: 220, objectFit: 'cover', marginTop: '0.35rem' }} />
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  )
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GenerateContent />
    </Suspense>
  )
}
