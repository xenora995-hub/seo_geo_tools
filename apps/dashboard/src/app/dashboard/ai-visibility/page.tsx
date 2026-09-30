'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import api from '@/lib/api'

interface TestRunItem {
  id: string
  query: string
  sourceType: string
  model: string
  status: 'not_checked' | 'mentioned' | 'cited' | 'not_found_in_run' | 'error'
  brandMentioned: boolean
  domainCited: boolean
  domainInSources: boolean
  citationUrls: string[]
  responseText: string
  evidenceNotes?: string | null
  isLegacySimulation: boolean
  testedAt: string
}

interface BranchItem {
  id: string
  branchCode: string
  branchName: string
  relationship: string
  address: string
  city: string
  areaServed: string[]
  phone: string
  openingHours: string
  googleMapsUrl?: string
  pageUrl?: string
  isWalkIn: boolean
  hasVillaService: boolean
  hasPickup: boolean
  servicesOffered: string[]
}

interface AuditFinding {
  id: string
  targetUrl: string
  category: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  issue: string
  evidence: string
  recommendation: string
  proposedPatch?: string | null
  status: string
}

function AiVisibilityContent() {
  const searchParams = useSearchParams()
  const tenantIdQuery = searchParams.get('tenantId')

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [runs, setRuns] = useState<TestRunItem[]>([])
  const [branches, setBranches] = useState<BranchItem[]>([])
  const [findings, setFindings] = useState<AuditFinding[]>([])

  // Discovery prompt testing
  const [testQuery, setTestQuery] = useState('')
  const [testing, setTesting] = useState(false)

  // Manual logging modal
  const [showManualModal, setShowManualModal] = useState(false)
  const [manualForm, setManualForm] = useState({
    query: '',
    model: 'ChatGPT App (GPT-4o)',
    status: 'not_found_in_run',
    brandMentioned: false,
    domainCited: false,
    evidenceNotes: ''
  })

  // Scanning target site
  const [scanning, setScanning] = useState(false)
  const [exportPatchModal, setExportPatchModal] = useState<any | null>(null)
  const [pushingIndexNow, setPushingIndexNow] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setNotification({ type, text })
    setTimeout(() => setNotification(null), 6000)
  }

  const getEffectiveTenantId = () => {
    if (tenantIdQuery) return tenantIdQuery
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          return JSON.parse(userStr).tenantId || ''
        } catch {}
      }
    }
    return ''
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const tenantId = getEffectiveTenantId()
      const query = tenantId ? `?tenantId=${tenantId}` : ''

      const [summaryRes, runsRes, branchesRes, findingsRes] = await Promise.all([
        api.get(`/api/ai-visibility${query}`),
        api.get(`/api/ai-visibility/runs${query}`),
        api.get(`/api/ai-visibility/branches${query}`),
        api.get(`/api/audit-engine/findings${query}`)
      ])

      if (summaryRes.data.success) setData(summaryRes.data.data)
      if (runsRes.data.success) setRuns(runsRes.data.data)
      if (branchesRes.data.success) setBranches(branchesRes.data.data.branches || [])
      if (findingsRes.data.success) setFindings(findingsRes.data.data || [])
    } catch (err: any) {
      console.error(err)
      showToast('error', err.response?.data?.message || 'Gagal memuat data visibilitas AI.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tenantIdQuery])

  // Run unbiased AI discovery test
  const handleRunDiscoveryTest = async (q?: string) => {
    const promptToTest = q || testQuery
    if (!promptToTest.trim()) return

    setTesting(true)
    try {
      const tenantId = getEffectiveTenantId()
      const res = await api.post('/api/ai-visibility/test-run', {
        tenantId,
        query: promptToTest.trim()
      })
      if (res.data.success) {
        showToast('success', `Uji pencarian AI selesai. Status: ${res.data.data.status}`)
        setTestQuery('')
        loadData()
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal menjalankan pengujian.')
    } finally {
      setTesting(false)
    }
  }

  // Submit manual ChatGPT App test log
  const handleSaveManualLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualForm.query.trim()) return

    try {
      const tenantId = getEffectiveTenantId()
      const res = await api.post('/api/ai-visibility/manual-log', {
        tenantId,
        ...manualForm
      })
      if (res.data.success) {
        showToast('success', 'Hasil pengujian manual ChatGPT App berhasil disimpan!')
        setShowManualModal(false)
        setManualForm({
          query: '',
          model: 'ChatGPT App (GPT-4o)',
          status: 'not_found_in_run',
          brandMentioned: false,
          domainCited: false,
          evidenceNotes: ''
        })
        loadData()
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal menyimpan hasil pengujian.')
    }
  }

  // Scan target site live for issues
  const handleScanTargetSite = async () => {
    setScanning(true)
    try {
      const tenantId = getEffectiveTenantId()
      const res = await api.post('/api/audit-engine/scan', { tenantId })
      if (res.data.success) {
        showToast('success', `Scan selesai! Ditemukan ${res.data.findingsCount} isu terverifikasi.`)
        loadData()
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal memindai website target.')
    } finally {
      setScanning(false)
    }
  }

  // Export patch package
  const handleExportPatch = async () => {
    try {
      const tenantId = getEffectiveTenantId()
      const res = await api.get(`/api/audit-engine/export-patch?tenantId=${tenantId}`)
      if (res.data.success) {
        setExportPatchModal(res.data.data)
      }
    } catch (err: any) {
      showToast('error', 'Gagal menghasilkan patch package.')
    }
  }

  // Push IndexNow
  const handlePushIndexNow = async () => {
    if (!confirm('Kirim seluruh artikel terbit ke Microsoft Bing & IndexNow (ChatGPT Search) sekarang?')) return
    setPushingIndexNow(true)
    try {
      const tenantId = getEffectiveTenantId()
      const res = await api.post('/api/ai-visibility/push-indexnow', { tenantId })
      if (res.data.success) {
        showToast('success', res.data.message || 'Semua artikel berhasil disubmit ke IndexNow!')
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal mengirim ke IndexNow.')
    } finally {
      setPushingIndexNow(false)
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 9999,
          padding: '1rem 1.4rem',
          borderRadius: '10px',
          backdropFilter: 'blur(10px)',
          background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.95)' :
                      notification.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(99, 102, 241, 0.95)',
          color: '#fff',
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.9rem',
          fontWeight: 500
        }}>
          <span>{notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}</span>
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '2rem' }}>🤖</span>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Audit Visibilitas AI & ChatGPT Search
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Pengukuran jujur & verifikasi keterlihatan brand{' '}
                <strong style={{ color: 'var(--accent-light)' }}>{data?.tenant?.name || 'Bali Phone Repair'}</strong>{' '}
                ({data?.tenant?.domain}) pada ChatGPT Search.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowManualModal(true)}
            className="btn btn-outline"
            style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}
          >
            ✍️ Catat Hasil ChatGPT App
          </button>

          <button
            onClick={handleScanTargetSite}
            disabled={scanning}
            className="btn btn-outline"
            style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', borderColor: 'rgba(245,158,11,0.5)', color: 'var(--warning)' }}
          >
            <span>{scanning ? '⏳' : '🩺'}</span>
            <span>{scanning ? 'Memindai...' : 'Scan & Deteksi Isu Situs'}</span>
          </button>

          <button
            onClick={handleExportPatch}
            className="btn btn-outline"
            style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', borderColor: 'rgba(16,185,129,0.5)', color: 'var(--success)' }}
          >
            📦 Ekspor Patch Siap Review
          </button>

          <button
            onClick={handlePushIndexNow}
            disabled={pushingIndexNow}
            className="btn btn-primary"
            style={{ padding: '0.6rem 1.1rem', fontSize: '0.85rem' }}
          >
            <span>{pushingIndexNow ? '⏳' : '⚡'}</span>
            <span>{pushingIndexNow ? 'Mengirim...' : 'Push IndexNow'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          <p>Memuat metrik audit terverifikasi...</p>
        </div>
      ) : (
        <>
          {/* Honest Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="card">
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Total Pengujian Tercatat
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>
                {data?.metrics?.totalRuns || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                Termasuk 7 baseline query pengguna
              </div>
            </div>

            <div className="card">
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Status: Dikutip (Cited)
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>
                {data?.metrics?.citedRuns || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.4rem' }}>
                Domain langsung menjadi rujukan link
              </div>
            </div>

            <div className="card">
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Status: Disebut (Mentioned)
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-light)' }}>
                {data?.metrics?.mentionedRuns || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                Brand muncul dalam teks rekomendasi
              </div>
            </div>

            <div className="card">
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Status: Belum Muncul
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)' }}>
                {data?.metrics?.notFoundRuns || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.4rem' }}>
                Perlu perbaikan identitas cabang & konten
              </div>
            </div>
          </div>

          {/* REAL CASE BREAKDOWN: CITED AS SOURCE #1 BUT ALTERNATIVE FOOTNOTE */}
          <div className="card" style={{ marginBottom: '2rem', border: '1px solid rgba(99, 102, 241, 0.4)', background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.08) 0%, rgba(15, 23, 42, 0.4) 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0.6rem', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <span>🎯 KASUS RIIL TERBARU</span>
                  <span>•</span>
                  <span>TERINDIKASI SEBAGAI SUMBER #1</span>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                  Mengapa baliphonerepair.com Dikutip ChatGPT tapi Masuk di Kalimat Cadangan ("Kalau Tidak Mau ke Toko"), Bukan di 5 Besar?
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                  Bedah logika AI ChatGPT Search saat menanggapi kueri: <em>"servis HP di Bali / bali phone repair"</em>.
                </p>
              </div>
              <button onClick={handleExportPatch} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                📦 Lihat Patch Solusi 5 Besar
              </button>
            </div>

            {/* Grid Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {/* Kolom Kiri: Apa yang Terjadi di ChatGPT */}
              <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f59e0b', marginBottom: '0.75rem' }}>
                  🔎 Fakta Pencarian ChatGPT (Sesuai Bukti Screenshot)
                </div>
                <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0, paddingLeft: '1.2rem' }}>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#10b981' }}>Domain baliphonerepair.com CITED:</strong> Berada di urutan teratas kotak <em>Sources</em> ChatGPT.
                  </li>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ color: 'var(--text)' }}>Top 5 Toko Fisik yang Dipilih ChatGPT:</strong>
                    <ol style={{ marginTop: '0.25rem', paddingLeft: '1.2rem' }}>
                      <li>DEWATA REPAIR PANJER (Buka s/d 22:00)</li>
                      <li>Dewata Repair Teuku Umar (Buka s/d 22:00)</li>
                      <li>iColor Bali (Buka s/d 22:00)</li>
                      <li>iFixied Apple Service (Jl. Teuku Umar)</li>
                      <li>Cellular World (Jl. Teuku Umar, Buka s/d 22:00)</li>
                    </ol>
                  </li>
                  <li>
                    <strong style={{ color: '#f59e0b' }}>Posisi Bali Phone Repair di Teks:</strong>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px', marginTop: '0.25rem', fontStyle: 'italic', color: 'var(--text)' }}>
                      "Kalau kamu nggak mau datang ke toko, Bali Phone Repair juga menyediakan mobile repair ke villa/hotel/lokasi kamu di Bali"
                    </div>
                  </li>
                </ul>
              </div>

              {/* Kolom Kanan: Mengapa ChatGPT Berpikir Demikian? */}
              <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#6366f1', marginBottom: '0.75rem' }}>
                  🧠 Mengapa ChatGPT Menaruhnya Sebagai "Alternatif Cadangan"?
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <div>
                    <strong style={{ color: 'var(--text)' }}>1. Persepsi Entitas: "Panggilan Saja" vs "Toko Offline"</strong>
                    <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: '1.4' }}>
                      Website saat ini sangat menonjolkan layanan mobile ke villa. Akibatnya crawler AI mengira Bali Phone Repair adalah opsi <em>khusus bagi yang malas ke toko</em>, bukan toko walk-in utama.
                    </p>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text)' }}>2. Padahal Memiliki Cabang di Jl. Teuku Umar!</strong>
                    <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: '1.4' }}>
                      3 dari 5 rekomendasi ChatGPT berada di Jl. Teuku Umar. Bali Phone Repair memiliki <strong>iSmart Teuku Umar (Jl. Teuku Umar No. 241)</strong>, tetapi karena belum ada di website, ChatGPT tidak mengetahuinya!
                    </p>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text)' }}>3. Ketiadaan Sinyal Jam Tutup Malam (Buka s/d 22:00)</strong>
                    <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: '1.4' }}>
                      ChatGPT secara eksplisit mencari tempat yang "buka sampai 22:00 hari ini". Toko tanpa Schema <code>openingHoursSpecification</code> malam dilewati dari daftar toko offline.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Strategi Masuk 5 Besar */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
                🚀 3 Langkah di Website untuk Masuk Top 5 Toko Rekomendasi ChatGPT:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px', padding: '0.75rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent-light)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                    1. Rebranding Hero: Dual Authority
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Pasang badge utama: <em>"Toko Fisik Walk-in Buka Setiap Hari s/d 21:00/22:00 (Teuku Umar, Denpasar & Canggu) + Layanan Panggilan Villa"</em>.
                  </div>
                </div>
                <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px', padding: '0.75rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent-light)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                    2. Terbitkan iSmart Teuku Umar
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Tampilkan alamat resmi Jl. Teuku Umar No. 241 agar langsung bersaing secara entitas geografis dengan Dewata Repair & iFixied.
                  </div>
                </div>
                <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px', padding: '0.75rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent-light)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                    3. Schema Jam Buka (OpeningHours)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Pasang Schema openingHoursSpecification agar ChatGPT mengenali workshop berstatus "buka hari ini sampai malam".
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* VERIFIED BRANCHES OF BALI PHONE REPAIR */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  🏢 Cabang Terverifikasi Milik Bali Phone Repair
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  Hubungan kepemilikan cabang resmi yang wajib dipahami oleh crawler AI dan pengunjung.
                </p>
              </div>
              <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '6px', background: 'rgba(99,102,241,0.15)', color: 'var(--accent-light)' }}>
                {branches.length} Cabang Terdaftar
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              {branches.map((b) => (
                <div key={b.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)' }}>
                      📍 {b.branchName}
                    </div>
                    <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                      Cabang Resmi
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-light)', marginBottom: '0.5rem', fontWeight: 500 }}>
                    "{b.relationship}"
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    <strong>Alamat:</strong> {b.address}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    <strong>Area Layanan:</strong> {b.areaServed.join(', ')}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                    <strong>Jam Buka:</strong> {b.openingHours}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {b.isWalkIn && <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}>🏬 Walk-in Workshop</span>}
                    {b.hasVillaService && <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}>🛵 Villa Service</span>}
                    {b.hasPickup && <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}>📦 Courier Pickup</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AUDIT FINDINGS WITH CONCRETE EVIDENCE & PATCHES */}
          {findings.length > 0 && (
            <div className="card" style={{ marginBottom: '2rem', border: '1px solid rgba(245,158,11,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--warning)' }}>
                    ⚠️ Temuan Audit Akses, Identitas & Indexability ({findings.length} Isu)
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                    Faktor penyebab mengapa ChatGPT belum mereferensikan Bali Phone Repair pada kueri Canggu/Pererenan.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {findings.map((f) => (
                  <div key={f.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
                        {f.issue}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: f.priority === 'HIGH' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                          color: f.priority === 'HIGH' ? '#ef4444' : '#f59e0b',
                          border: `1px solid ${f.priority === 'HIGH' ? '#ef4444' : '#f59e0b'}`
                        }}>
                          {f.priority} PRIORITY
                        </span>
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                          {f.category}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                      <strong>Bukti Lokasi/URL:</strong> <code>{f.targetUrl}</code>
                      <br />
                      <strong>Bukti Konkret:</strong> {f.evidence}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text)', background: 'rgba(99,102,241,0.06)', borderLeft: '3px solid var(--accent)', padding: '0.5rem 0.8rem', borderRadius: '0 6px 6px 0', marginBottom: f.proposedPatch ? '0.6rem' : '0' }}>
                      <strong>Saran Perbaikan:</strong> {f.recommendation}
                    </div>

                    {f.proposedPatch && (
                      <div style={{ marginTop: '0.6rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                          Usulan Perubahan (Patch / Diff Preview):
                        </div>
                        <pre style={{
                          background: '#0a0d16',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          fontSize: '0.75rem',
                          color: '#e2e8f0',
                          overflowX: 'auto',
                          maxHeight: '150px'
                        }}>
                          {f.proposedPatch}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BASELINE & TEST RUNS HISTORY TABLE */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  📋 Catatan Pengujian Nyata (Termasuk 7 Pertanyaan Baseline)
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  Tidak ada data estimasi yang ditampilkan sebagai kemunculan terverifikasi.
                </p>
              </div>
              <button
                onClick={() => setShowManualModal(true)}
                className="btn btn-outline"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
              >
                + Tambah Hasil Tes Manual
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Kueri Pengujian</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Metode & Model</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Status Eksplisit</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Konteks & Bukti</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600, color: 'var(--text)', maxWidth: '320px' }}>
                        "{r.query}"
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)' }}>
                        <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text)' }}>{r.sourceType}</span>
                        <span style={{ fontSize: '0.7rem' }}>{r.model}</span>
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: r.status === 'cited' ? 'rgba(16,185,129,0.2)' :
                                      r.status === 'mentioned' ? 'rgba(99,102,241,0.2)' :
                                      r.status === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                          color: r.status === 'cited' ? '#10b981' :
                                 r.status === 'mentioned' ? 'var(--accent-light)' :
                                 r.status === 'error' ? '#ef4444' : '#f59e0b',
                          border: `1px solid ${r.status === 'cited' ? '#10b981' : r.status === 'mentioned' ? 'var(--accent)' : r.status === 'error' ? '#ef4444' : '#f59e0b'}`
                        }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '300px' }}>
                        {r.evidenceNotes || '-'}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {new Date(r.testedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* UNBIASED LIVE TEST RUNNER */}
          <div className="card">
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              🔍 Jalankan Uji Netral Discovery (OpenAI Web-Search / Gemini Grounding)
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Pengujian ini tidak menyuntikkan nama brand/domain ke prompt, melainkan menanyakan kueri pencarian alami.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); handleRunDiscoveryTest() }} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Ketik kueri, misal: Where can I get my phone repaired in Canggu?"
                style={{
                  flex: 1,
                  minWidth: '280px',
                  padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={testing || !testQuery.trim()}
                className="btn btn-primary"
                style={{ padding: '0.75rem 1.25rem', fontSize: '0.85rem' }}
              >
                {testing ? 'Menguji...' : 'Uji Discovery'}
              </button>
            </form>
          </div>
        </>
      )}

      {/* MODAL: MANUAL LOG CHATGPT APP TEST */}
      {showManualModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '550px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>
              ✍️ Catat Hasil Pengujian Manual ChatGPT App
            </h3>

            <form onSubmit={handleSaveManualLog}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Pertanyaan yang Diketik di ChatGPT:
                </label>
                <input
                  type="text"
                  required
                  value={manualForm.query}
                  onChange={(e) => setManualForm({ ...manualForm, query: e.target.value })}
                  placeholder="Contoh: Where can I get my phone repaired in Canggu?"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Versi / Model ChatGPT:
                </label>
                <input
                  type="text"
                  value={manualForm.model}
                  onChange={(e) => setManualForm({ ...manualForm, model: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Status Hasil:
                </label>
                <select
                  value={manualForm.status}
                  onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '6px', color: '#000' }}
                >
                  <option value="not_found_in_run">not_found_in_run (Tidak muncul)</option>
                  <option value="mentioned">mentioned (Nama brand disebut dalam jawaban)</option>
                  <option value="cited">cited (Domain baliphonerepair.com dikutip dengan link)</option>
                  <option value="error">error (Pencarian gagal)</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Catatan Bukti (Siapa yang muncul, kompetitor, dll.):
                </label>
                <textarea
                  rows={3}
                  value={manualForm.evidenceNotes}
                  onChange={(e) => setManualForm({ ...manualForm, evidenceNotes: e.target.value })}
                  placeholder="Contoh: Bali Phone Repair tidak muncul. PROS Device Care muncul di urutan #2."
                  style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowManualModal(false)} className="btn btn-outline">
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXPORT PATCH PACKAGE */}
      {exportPatchModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                📦 Paket Perubahan (Patch Package) Siap Review
              </h3>
              <button onClick={() => setExportPatchModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              File-file berikut disiapkan untuk dipasang ke website Laravel <strong>baliphonerepair.com</strong> agar identitas cabang, robots.txt, dan schema valid:
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)', marginBottom: '0.3rem' }}>
                1. <code>{exportPatchModal.robotsTxt?.targetFile}</code>
              </div>
              <pre style={{ background: '#0a0d16', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: '#e2e8f0', overflowX: 'auto' }}>
                {exportPatchModal.robotsTxt?.content}
              </pre>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)', marginBottom: '0.3rem' }}>
                2. <code>{exportPatchModal.branchFooterBlade?.targetFile}</code>
              </div>
              <pre style={{ background: '#0a0d16', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: '#e2e8f0', overflowX: 'auto', maxHeight: '150px' }}>
                {exportPatchModal.branchFooterBlade?.content}
              </pre>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)', marginBottom: '0.3rem' }}>
                3. <code>{exportPatchModal.schemaOrg?.targetFile}</code>
              </div>
              <pre style={{ background: '#0a0d16', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: '#e2e8f0', overflowX: 'auto', maxHeight: '150px' }}>
                {exportPatchModal.schemaOrg?.content}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(exportPatchModal, null, 2))
                  showToast('success', 'Seluruh isi patch berhasil disalin ke clipboard!')
                }}
                className="btn btn-outline"
              >
                📋 Salin Semua ke Clipboard
              </button>
              <button onClick={() => setExportPatchModal(null)} className="btn btn-primary">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AiVisibilityPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Memuat...</div>}>
      <AiVisibilityContent />
    </Suspense>
  )
}
