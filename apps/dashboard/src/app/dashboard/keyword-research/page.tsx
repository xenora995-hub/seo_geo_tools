'use client'
import { useState } from 'react'

export default function KeywordResearchPage() {
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('Global')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyword) return
    setLoading(true)
    try {
      // Simulate API call to backend
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/keywords/research?q=${keyword}&location=${location}`)
      const data = await res.json()
      if (data.success) {
        setResult(data.data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getDifficultyColor = (score: number) => {
    if (score < 30) return 'text-green-500 bg-green-50'
    if (score < 70) return 'text-yellow-500 bg-yellow-50'
    return 'text-red-500 bg-red-50'
  }

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case 'Informational': return 'bg-blue-100 text-blue-700'
      case 'Transactional': return 'bg-purple-100 text-purple-700'
      case 'Commercial': return 'bg-orange-100 text-orange-700'
      case 'Navigational': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>🔍 Riset Kata Kunci</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Temukan kata kunci terbaik untuk kampanye SEO lokal maupun global Anda.</p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label>Kata Kunci</label>
            <input 
              type="text" 
              placeholder="Contoh: Jasa sedot wc" 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <div style={{ width: 200 }}>
            <label>Lokasi Target</label>
            <select 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="Global">🌎 Global</option>
              <option value="Indonesia">🇮🇩 Indonesia</option>
            </select>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary"
            style={{ height: '46px', minWidth: '120px', justifyContent: 'center' }}
          >
            {loading ? 'Mencari...' : 'Analisa'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', animation: 'slideUp 0.3s ease' }}>
          <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Hasil Analisis: "{result.term}"</h2>
            <span className={`badge ${result.searchIntent === 'Informational' ? 'badge-info' : result.searchIntent === 'Transactional' ? 'badge-success' : 'badge-warning'}`}>
              {result.searchIntent} Intent
            </span>
          </div>
          
          <div style={{ padding: '1.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              
              <div style={{ padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem' }}>Search Volume</span>
                <span style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>{result.volume.toLocaleString()}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>pencarian/bulan</span>
              </div>
              
              <div style={{ padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem' }}>Keyword Difficulty</span>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mt-2 mb-1 ${getDifficultyColor(result.difficulty)}`}>
                  <span className="text-2xl font-bold">{result.difficulty}</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>skala 0-100</span>
              </div>
              
              <div style={{ padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem' }}>Cost Per Click (CPC)</span>
                <span style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>${result.cpc}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>estimasi biaya iklan</span>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
