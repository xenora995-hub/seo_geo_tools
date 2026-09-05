'use client'
import { useState, useEffect } from 'react'

export default function SeoWritingPage() {
  // Mode: 'manual' or 'ai'
  const [mode, setMode] = useState<'manual' | 'ai'>('manual')
  
  // Editor State
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [keywords, setKeywords] = useState('')
  const [analysis, setAnalysis] = useState<any>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [timer, setTimer] = useState<any>(null)

  // AI Generator State
  const [aiTopic, setAiTopic] = useState('')
  const [aiTargetUrl, setAiTargetUrl] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (mode === 'manual' && (content || keywords)) {
      setIsTyping(true)
      if (timer) clearTimeout(timer)
      
      const newTimer = setTimeout(() => {
        analyzeText()
      }, 1000)
      
      setTimer(newTimer)
    }
    return () => clearTimeout(timer)
  }, [content, keywords, mode])

  const analyzeText = async () => {
    try {
      const keywordList = keywords.split(',').map(k => k.trim()).filter(Boolean)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/seo-writing/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, targetKeywords: keywordList })
      })
      const data = await res.json()
      if (data.success) {
        setAnalysis(data.data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsTyping(false)
    }
  }

  const handleGenerateAI = async () => {
    if (!aiTopic || !aiTargetUrl) return
    setIsGenerating(true)
    try {
      const userStr = localStorage.getItem('user')
      const tenantId = userStr ? JSON.parse(userStr).tenantId : 'dummy-tenant-id'

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/seo-writing/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, targetUrl: aiTargetUrl, tenantId })
      })
      const data = await res.json()
      if (data.success && data.data) {
        // Auto-fill editor
        setTitle(data.data.title || '')
        setContent(data.data.content || '')
        setKeywords(data.data.keywords || '')
        // Switch back to manual mode to edit & score
        setMode('manual')
      } else {
        alert(data.error || 'Gagal menghasilkan artikel AI')
      }
    } catch (error) {
      console.error('Error generating AI:', error)
      alert('Terjadi kesalahan jaringan.')
    } finally {
      setIsGenerating(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'
    if (score >= 50) return '#f59e0b'
    return '#ef4444'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return { bg: 'rgba(16, 185, 129, 0.05)', border: 'rgba(16, 185, 129, 0.2)' }
    if (score >= 50) return { bg: 'rgba(245, 158, 11, 0.05)', border: 'rgba(245, 158, 11, 0.2)' }
    return { bg: 'rgba(239, 68, 68, 0.05)', border: 'rgba(239, 68, 68, 0.2)' }
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: '2rem', height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header with Tabs */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>✍️</span> SEO Writing Assistant
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Tulis artikel Anda atau biarkan AI merumuskan strategi dan menulis draf awal untuk Anda.
          </p>
        </div>
        
        {/* Mode Switcher */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '0.35rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <button 
            onClick={() => setMode('manual')}
            style={{ 
              padding: '0.5rem 1.25rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer',
              background: mode === 'manual' ? 'var(--accent)' : 'transparent',
              color: mode === 'manual' ? 'white' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            Tulis Manual
          </button>
          <button 
            onClick={() => setMode('ai')}
            style={{ 
              padding: '0.5rem 1.25rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: mode === 'ai' ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'transparent',
              color: mode === 'ai' ? 'white' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            ✨ Buat dengan AI
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: '1.5rem', minHeight: 0 }}>
        
        {/* Left Area (Editor OR AI Generator) */}
        {mode === 'manual' ? (
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
              <input 
                type="text" 
                placeholder="Masukkan Judul Artikel..." 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ 
                  width: '100%', background: 'transparent', border: 'none', outline: 'none',
                  fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', padding: 0
                }}
              />
            </div>
            <textarea 
              style={{ 
                flex: 1, width: '100%', background: 'transparent', border: 'none', outline: 'none',
                padding: '1.5rem', fontSize: '1rem', color: 'var(--text)', lineHeight: 1.7,
                resize: 'none', fontFamily: 'inherit'
              }}
              placeholder="Mulai mengetikkan paragraf pertama Anda di sini..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            ></textarea>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div className="card" style={{ width: '100%', maxWidth: '700px', margin: '0 auto', padding: '3.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <div style={{ width: 72, height: 72, margin: '0 auto 1.5rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', border: '1px solid rgba(168, 85, 247, 0.2)', boxShadow: '0 10px 25px rgba(168, 85, 247, 0.1)' }}>🤖</div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>Autopilot SEO Generator</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>Biarkan AI mencari kata kunci GEO terbaik dan merangkai draf dasar yang sudah teroptimasi penuh untuk website Anda.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Topik Artikel / Pembahasan</label>
                  <input 
                    type="text" 
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="Contoh: Pentingnya Jasa Sedot WC di Jakarta"
                    style={{ 
                      width: '100%', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', 
                      borderRadius: '12px', color: 'var(--text)', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent-light)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Website Tujuan (Target URL) 🎯</label>
                  <input 
                    type="url" 
                    value={aiTargetUrl}
                    onChange={(e) => setAiTargetUrl(e.target.value)}
                    placeholder="https://sedotwc-jakarta.com/layanan"
                    style={{ 
                      width: '100%', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', 
                      borderRadius: '12px', color: 'var(--text)', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent-light)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>

                <button 
                  onClick={handleGenerateAI}
                  disabled={!aiTopic || !aiTargetUrl || isGenerating}
                  style={{
                    width: '100%', padding: '1.25rem', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 700,
                    background: (!aiTopic || !aiTargetUrl || isGenerating) ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #a855f7, #6366f1)',
                    color: (!aiTopic || !aiTargetUrl || isGenerating) ? 'var(--text-muted)' : 'white',
                    border: 'none', cursor: (!aiTopic || !aiTargetUrl || isGenerating) ? 'not-allowed' : 'pointer',
                    marginTop: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem',
                    boxShadow: (!aiTopic || !aiTargetUrl || isGenerating) ? 'none' : '0 8px 25px rgba(168, 85, 247, 0.3)',
                    transition: 'all 0.2s'
                  }}
                >
                  {isGenerating ? (
                    <>
                      <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                      Meracik Artikel & Riset Keyword...
                    </>
                  ) : (
                    <>✨ Generate Artikel SEO & Kata Kunci</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar Analysis (Right) - Only visible in Manual mode or when we have analysis */}
        {(mode === 'manual' || analysis) && (
          <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
            
            {/* Target Keywords Input */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Target Kata Kunci</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Pisahkan dengan koma (contoh: bali tour, sewa mobil bali)</p>
              <textarea 
                style={{ 
                  width: '100%', height: '80px', resize: 'none',
                  background: 'var(--surface-2)', border: '1px solid var(--border)', 
                  borderRadius: '8px', padding: '0.75rem', color: 'var(--text)', fontSize: '0.875rem',
                  outline: 'none', transition: 'border-color 0.2s'
                }}
                placeholder="Ketik kata kunci di sini..."
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-light)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              ></textarea>
              
              {/* Realtime Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
                <span style={{ color: 'var(--text-muted)' }}>Status Analisis:</span>
                {isTyping ? (
                  <span style={{ color: 'var(--accent-light)', animation: 'pulse 1.5s infinite' }}>Sedang Memproses...</span>
                ) : (
                  <span style={{ color: '#10b981' }}>✓ Real-time Aktif</span>
                )}
              </div>
            </div>

            {/* Score Cards */}
            {analysis && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Overall SEO Score */}
                <div style={{ 
                  padding: '1.25rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem',
                  background: getScoreBg(analysis.seoScore).bg, border: `1px solid ${getScoreBg(analysis.seoScore).border}`
                }}>
                  <div style={{ 
                    width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--surface)', border: `2px solid ${getScoreColor(analysis.seoScore)}`,
                    boxShadow: `0 0 15px ${getScoreBg(analysis.seoScore).bg}`
                  }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: getScoreColor(analysis.seoScore) }}>{analysis.seoScore}</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Skor SEO</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Berdasarkan kepadatan kata kunci dan struktur teks.</p>
                  </div>
                </div>

                {/* Readability Score */}
                <div style={{ 
                  padding: '1.25rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem',
                  background: getScoreBg(analysis.readabilityScore).bg, border: `1px solid ${getScoreBg(analysis.readabilityScore).border}`
                }}>
                  <div style={{ 
                    width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--surface)', border: `2px solid ${getScoreColor(analysis.readabilityScore)}`,
                    boxShadow: `0 0 15px ${getScoreBg(analysis.readabilityScore).bg}`
                  }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: getScoreColor(analysis.readabilityScore) }}>{analysis.readabilityScore}</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Keterbacaan (Readability)</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Indikator kemudahan AI & manusia membaca teks.</p>
                  </div>
                </div>

                {/* Stats Card */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '1rem' }}>Statistik Kata Kunci</h3>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <span style={{ fontSize: '0.875rem' }}>Total Kata</span>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>{analysis.wordCount}</span>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.75rem' }}>Kepadatan (Density)</span>
                    
                    {analysis.keywordDensity.length === 0 ? (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Tidak ada kata kunci yang terdeteksi.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {analysis.keywordDensity.map((kd: any, idx: number) => {
                          const density = parseFloat(kd.density);
                          let barColor = '#f59e0b'; // yellow (under optimized)
                          if (density >= 0.5 && density <= 2.5) barColor = '#10b981'; // green (good)
                          if (density > 2.5) barColor = '#ef4444'; // red (stuffed)
                          
                          return (
                            <div key={idx}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                                <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }} title={kd.keyword}>{kd.keyword}</span>
                                <span style={{ color: 'var(--text-muted)' }}>{kd.count}x ({kd.density}%)</span>
                              </div>
                              <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', background: barColor, width: `${Math.min(density * 20, 100)}%`, borderRadius: '99px' }}></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
