'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import api from '@/lib/api'

function SettingsContent() {
  const searchParams = useSearchParams()
  const tenantIdQuery = searchParams.get('tenantId')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [generatingAi, setGeneratingAi] = useState(false)

  const [form, setForm] = useState({
    geminiApiKey: '',
    customPrompt: '',
    telegramBotToken: '',
    telegramChatId: '',
    articlesPerDay: 1,
    imageStyle: 'professional photography, clean background',
    businessNiche: '',
    targetKeywords: '',
    competitors: '',
    enableAutoIndex: false,
    googleServiceAccountJson: '',
    cmsType: 'WORDPRESS',
    cmsUrl: '',
    cmsApiKey: '',
    language: 'id',
    timezone: 'Asia/Jakarta',
    domain: '',
    name: '',
  })

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true)
        setError('')
        const url = tenantIdQuery ? `/api/settings?tenantId=${tenantIdQuery}` : '/api/settings'
        const res = await api.get(url)
        const d = res.data.data

        setForm({
          geminiApiKey: d.geminiApiKey || '',
          customPrompt: d.customPrompt || '',
          telegramBotToken: d.telegramBotToken || '',
          telegramChatId: d.telegramChatId || '',
          articlesPerDay: d.articlesPerDay || 1,
          imageStyle: d.imageStyle || 'professional photography, clean background',
          businessNiche: d.businessNiche || '',
          targetKeywords: Array.isArray(d.targetKeywords) ? d.targetKeywords.join(', ') : '',
          competitors: Array.isArray(d.competitors) ? d.competitors.join(', ') : '',
          enableAutoIndex: d.enableAutoIndex || false,
          googleServiceAccountJson: d.googleServiceAccountJson || '',
          cmsType: d.tenant?.cmsType || 'WORDPRESS',
          cmsUrl: d.tenant?.cmsUrl || '',
          cmsApiKey: d.tenant?.cmsApiKey || '',
          language: d.tenant?.language || 'id',
          timezone: d.timezone || 'Asia/Jakarta',
          domain: d.tenant?.domain || '',
          name: d.tenant?.name || '',
        })
      } catch (err: any) {
        setError(err.response?.data?.message || 'Gagal memuat pengaturan')
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [tenantIdQuery])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const keywordsArray = form.targetKeywords.split(',').map(k => k.trim()).filter(Boolean)
    const competitorsArray = form.competitors.split(',').map(c => c.trim()).filter(Boolean)

    try {
      const url = tenantIdQuery ? `/api/settings?tenantId=${tenantIdQuery}` : '/api/settings'
      await api.patch(url, {
        geminiApiKey: form.geminiApiKey,
        customPrompt: form.customPrompt,
        telegramBotToken: form.telegramBotToken,
        telegramChatId: form.telegramChatId,
        articlesPerDay: Number(form.articlesPerDay),
        imageStyle: form.imageStyle,
        businessNiche: form.businessNiche,
        targetKeywords: keywordsArray,
        competitors: competitorsArray,
        cmsType: form.cmsType,
        cmsUrl: form.cmsUrl,
        cmsApiKey: form.cmsApiKey,
        language: form.language,
        timezone: form.timezone,
        googleServiceAccountJson: form.googleServiceAccountJson,
      })
      setSuccess('Pengaturan berhasil disimpan!')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menyimpan pengaturan')
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateKeywords = async () => {
    if (!form.businessNiche) {
      setError('Silakan isi Bidang Bisnis / Topik Website terlebih dahulu.')
      return
    }
    if (!form.geminiApiKey) {
      setError('Kunci Akses Gemini harus diisi dan disimpan sebelum menggunakan fitur ini.')
      return
    }
    setGeneratingAi(true)
    setError('')
    try {
      const url = tenantIdQuery ? `/api/settings/generate-keywords?tenantId=${tenantIdQuery}` : '/api/settings/generate-keywords'
      const res = await api.post(url, {
        businessNiche: form.businessNiche,
        domain: form.domain || form.cmsUrl || ''
      })
      const data = res.data.data
      
      setForm(prev => ({
        ...prev,
        targetKeywords: (data.keywords || []).join(', '),
        competitors: (data.competitors || []).join(', ')
      }))
      setSuccess('Target Keywords dan Kompetitor berhasil diisi oleh AI! Jangan lupa klik Simpan Pengaturan.')
      setTimeout(() => setSuccess(''), 6000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal generate keyword otomatis.')
    } finally {
      setGeneratingAi(false)
    }
  }

  const [scrapingWeb, setScrapingWeb] = useState(false)
  const handleScrapeWebsite = async () => {
    const domainToScrape = form.domain || form.cmsUrl
    if (!domainToScrape) {
      setError('Sistem tidak menemukan domain atau CMS URL. Silakan atur domain website Anda terlebih dahulu.')
      return
    }
    if (!form.geminiApiKey) {
      setError('Kunci Akses Gemini harus diisi dan disimpan sebelum menggunakan fitur ini.')
      return
    }
    setScrapingWeb(true)
    setError('')
    try {
      const tenantId = tenantIdQuery || ''
      const res = await api.post('/api/scraper/analyze-domain', {
        tenantId,
        domain: domainToScrape
      })
      const data = res.data.data
      
      setForm(prev => ({
        ...prev,
        businessNiche: data.businessNiche || prev.businessNiche,
        targetKeywords: data.targetKeywords || prev.targetKeywords,
      }))
      setSuccess('Website berhasil dianalisis! Bidang Bisnis dan Target Keywords telah diisi otomatis. Jangan lupa klik Simpan Pengaturan.')
      setTimeout(() => setSuccess(''), 6000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal menganalisis website.')
    } finally {
      setScrapingWeb(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat pengaturan...</div>
  }

  return (
    <div style={{ maxWidth: 840 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>⚙️ Pengaturan Tenant & API</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {form.name ? `Konfigurasi untuk: ${form.name} (${form.domain})` : 'Konfigurasi kredensial AI, Telegram bot, dan CMS'}
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🌐 Pengaturan Regional & Waktu
        </h2>
        <div>
          <label>Zona Waktu Website (Digunakan oleh Robot Penulis / Scheduler)</label>
          <select
            value={form.timezone}
            onChange={e => setForm({ ...form, timezone: e.target.value })}
            style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 8 }}
          >
            <option value="Asia/Jakarta">WIB (Waktu Indonesia Barat) / Jakarta</option>
            <option value="Asia/Makassar">WITA (Waktu Indonesia Tengah) / Bali, Makassar</option>
            <option value="Asia/Jayapura">WIT (Waktu Indonesia Timur) / Jayapura</option>
          </select>
        </div>
      </div>

      {success && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '1rem', borderRadius: 10, marginBottom: '1.5rem' }}>
          ✅ {success}
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '1rem', borderRadius: 10, marginBottom: '1.5rem' }}>
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* OpenAI Section */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🤖 Google Gemini & Pollinations AI (100% Gratis)
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Dapatkan API Key Gemini secara gratis di <a href="https://aistudio.google.com" target="_blank" style={{ color: 'var(--accent-light)' }}>Google AI Studio</a>. Pembuatan gambar menggunakan Pollinations AI otomatis tanpa perlu kunci.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label>Kunci Akses Gemini (Gemini API Key)</label>
              <input
                type="password"
                value={form.geminiApiKey}
                onChange={e => setForm({ ...form, geminiApiKey: e.target.value })}
                placeholder="AIzaSy••••••••••••"
              />
            </div>
            <div>
              <label>Custom System Prompt (Opsional)</label>
              <textarea
                rows={4}
                value={form.customPrompt}
                onChange={e => setForm({ ...form, customPrompt: e.target.value })}
                placeholder="Paste instruksi lengkap dari Custom GPT Solon di sini..."
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Jika diisi, AI akan mengabaikan instruksi bawaan sistem dan patuh pada instruksi ini.
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label>Jumlah Artikel Otomatis per Hari</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.articlesPerDay}
                  onChange={e => setForm({ ...form, articlesPerDay: Number(e.target.value) })}
                />
              </div>
              <div>
                <label>Gaya Gambar AI</label>
                <input
                  value={form.imageStyle}
                  onChange={e => setForm({ ...form, imageStyle: e.target.value })}
                  placeholder="professional photography, clean background"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Telegram Command Center Section */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📱 Telegram Command Center
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Kendalikan aplikasi SEO Anda langsung dari Telegram. Bot akan mengirim laporan harian, sekaligus bisa diperintah mengetik artikel lewat HP Anda! Cukup masukkan Bot ke dalam grup Telegram, lalu masukkan ID grupnya di bawah.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label>Telegram Bot Token</label>
              <input
                type="text"
                value={form.telegramBotToken}
                onChange={e => setForm({ ...form, telegramBotToken: e.target.value })}
                placeholder="123456789:AAHxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <div>
              <label>Telegram Chat ID (Opsional)</label>
              <input
                value={form.telegramChatId}
                onChange={e => setForm({ ...form, telegramChatId: e.target.value })}
                placeholder="-1001234567890 atau @channel_username"
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Chat ID agar hanya Anda yang bisa memerintah bot.
              </p>
            </div>
          </div>
        </div>

        {/* SEO & GEO Target Keywords */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🎯 Target Keywords & Kompetitor (SEO & GEO)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Enable Auto Google Indexing</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.enableAutoIndex}
                    onChange={(e) => setForm({ ...form, enableAutoIndex: e.target.checked })}
                  />
                  <span>Kirim ping ke Google setiap kali artikel dipublish</span>
                </label>
              </div>

              {form.enableAutoIndex && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Google Service Account JSON (Untuk Indexing API)</label>
                  <textarea
                    className="input"
                    value={form.googleServiceAccountJson}
                    onChange={(e) => setForm({ ...form, googleServiceAccountJson: e.target.value })}
                    placeholder='{"type": "service_account", "project_id": "..."}'
                    style={{ minHeight: '120px', fontFamily: 'monospace', fontSize: '0.85rem' }}
                  ></textarea>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Paste isi dari file credentials JSON yang Anda dapatkan dari Google Cloud Platform. Pastikan email service account tersebut sudah ditambahkan sebagai "Owner" di properti Google Search Console Anda.
                  </p>
                </div>
              )}

              <label>Bidang Bisnis / Topik Website</label>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <input
                  style={{ flex: 1, minWidth: '200px' }}
                  value={form.businessNiche}
                  onChange={e => setForm({ ...form, businessNiche: e.target.value })}
                  placeholder="Misal: Klinik Gigi di Jakarta Selatan"
                />
                <button 
                  type="button" 
                  onClick={handleScrapeWebsite}
                  disabled={scrapingWeb || generatingAi}
                  className="btn"
                  style={{ whiteSpace: 'nowrap', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 600 }}
                >
                  {scrapingWeb ? '⏳ Membaca Web...' : '🔍 Deteksi dari Website'}
                </button>
                <button 
                  type="button" 
                  onClick={handleGenerateKeywords}
                  disabled={generatingAi || scrapingWeb || !form.businessNiche}
                  className="btn btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {generatingAi ? '⏳ Menganalisis...' : '🪄 Generate Keywords'}
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'block' }}>
                Masukkan bidang bisnis Anda dan biarkan AI mencarikan kata kunci SEO terbaik dan menganalisa kompetitor secara otomatis.
              </span>
            </div>

            <div>
              <label>Target Keywords Utama (pisahkan dengan koma)</label>
              <textarea
                rows={3}
                value={form.targetKeywords}
                onChange={e => setForm({ ...form, targetKeywords: e.target.value })}
                placeholder="jasa seo bali, web developer jakarta, optimasi search gpt"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Keyword ini digunakan oleh AI Generator saat membuat konten dan dipantau posisinya oleh Google & AI Search Crawler.
              </span>
            </div>
            <div>
              <label>Website Kompetitor (pisahkan dengan koma)</label>
              <input
                value={form.competitors}
                onChange={e => setForm({ ...form, competitors: e.target.value })}
                placeholder="kompetitor1.com, kompetitor2.id"
              />
            </div>
          </div>
        </div>

        {/* CMS Configuration */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🔌 Hubungkan ke Website Anda (WordPress / Laravel)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label>Tipe Website Anda</label>
                <select
                  value={form.cmsType}
                  onChange={e => setForm({ ...form, cmsType: e.target.value })}
                >
                  <option value="WORDPRESS">WordPress (REST API)</option>
                  <option value="LARAVEL">Laravel (Custom API)</option>
                  <option value="BLOGGER">Blogger (Blogspot)</option>
                </select>
              </div>
              <div>
                <label>Bahasa Default</label>
                <select
                  value={form.language}
                  onChange={e => setForm({ ...form, language: e.target.value })}
                >
                  <option value="id">Bahasa Indonesia</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div>
              <label>Alamat Website Anda</label>
              <input
                value={form.cmsUrl}
                onChange={e => setForm({ ...form, cmsUrl: e.target.value })}
                placeholder="Contoh: https://website-anda.com"
              />
            </div>

            <div>
              <label>{form.cmsType === 'LARAVEL' ? 'Bearer Token API Laravel / API Key' : form.cmsType === 'WORDPRESS' ? 'Password Khusus WordPress (Application Password)' : 'Password / Token API Website'}</label>
              <input
                type="password"
                value={form.cmsApiKey}
                onChange={e => setForm({ ...form, cmsApiKey: e.target.value })}
                placeholder={form.cmsType === 'LARAVEL' ? 'Contoh: 1|xxxxxxxxxxxxxxxxxxxxxxxxx atau API Key .env' : 'Application Password (WP) atau Bearer Token'}
              />
              {form.cmsType === 'LARAVEL' ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', lineHeight: 1.5, background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.07)' }}>
                  💡 <strong>Cara mendapatkan Token Laravel:</strong><br />
                  Jalankan di server/terminal website Laravel Anda:<br />
                  <code style={{ color: '#93c5fd' }}>php artisan tinker</code> lalu ketik:<br />
                  <code style={{ color: '#86efac' }}>$token = App\Models\User::first()-&gt;createToken('seo-tools')-&gt;plainTextToken; echo $token;</code><br />
                  Lalu copy token yang muncul dan paste di kolom ini.
                </div>
              ) : (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Buat di WordPress: Users → Profile → Add New Application Password
                </p>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '0.8rem 2rem' }}>
            {saving ? 'Menyimpan Pengaturan...' : '💾 Simpan Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat pengaturan...</div>}>
      <SettingsContent />
    </Suspense>
  )
}
