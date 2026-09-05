'use client'
import { useState, useEffect } from 'react'

export default function LocalListingPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const [formData, setFormData] = useState({
    businessName: '',
    address: '',
    phone: '',
    website: '',
    category: ''
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const userStr = localStorage.getItem('user')
      const tenantId = userStr ? JSON.parse(userStr).tenantId : 'dummy-tenant-id'
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/local-listing/profile?tenantId=${tenantId}`)
      const data = await res.json()
      if (data.success && data.data) {
        setProfile(data.data)
        setFormData({
          businessName: data.data.businessName,
          address: data.data.address,
          phone: data.data.phone,
          website: data.data.website || '',
          category: data.data.category || ''
        })
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const userStr = localStorage.getItem('user')
      const tenantId = userStr ? JSON.parse(userStr).tenantId : 'dummy-tenant-id'

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/local-listing/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tenantId })
      })
      const data = await res.json()
      if (data.success) {
        setProfile(data.data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    if (!profile) return
    setSyncing(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/local-listing/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id })
      })
      
      // Simulate real-time progress update
      if (res.ok) {
        setProfile({ ...profile, syncStatus: 'SYNCING' })
        setTimeout(() => {
          fetchProfile()
          setSyncing(false)
        }, 5000)
      }
    } catch (error) {
      console.error(error)
      setSyncing(false)
    }
  }

  const directories = [
    { name: 'Google Business', icon: 'G', color: '#4285F4' },
    { name: 'Apple Maps', icon: '', color: '#A2AAAD' },
    { name: 'Bing Places', icon: 'B', color: '#008373' },
    { name: 'Yelp', icon: 'Y', color: '#FF1A1A' },
    { name: 'TripAdvisor', icon: 'T', color: '#34E0A1' },
    { name: 'Foursquare', icon: 'F', color: '#F94877' }
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: '4rem' }}>
      
      {/* Premium Header */}
      <div style={{ 
        position: 'relative',
        padding: '3rem 2rem', 
        marginBottom: '2.5rem', 
        borderRadius: '24px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%', left: '-20%',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(0,0,0,0) 70%)',
          borderRadius: '50%',
          zIndex: 0,
          pointerEvents: 'none'
        }}/>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', padding: '0.35rem 0.85rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-light)', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '1rem', border: '1px solid rgba(99,102,241,0.2)' }}>
            LOCAL SEO AUTOMATION
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Broadcaster Direktori Lokal
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '600px', lineHeight: 1.6 }}>
            Kunci NAP (Name, Address, Phone) Anda satu kali, lalu biarkan AI memancarkannya ke puluhan jaringan direktori global untuk mendominasi pencarian lokal.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        
        {/* Form Bisnis Card */}
        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              🏢
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Profil Utama Bisnis</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Data ini akan dikunci sebagai identitas resmi (NAP).</span>
            </div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                <span>🏷️</span> Nama Bisnis Resmi
              </label>
              <input 
                type="text" 
                placeholder="Contoh: Bali Phone Repair Canggu"
                value={formData.businessName}
                onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                <span>📍</span> Alamat Lengkap Fisik
              </label>
              <textarea 
                placeholder="Alamat jalan, nomor, kota, kode pos..."
                style={{ minHeight: '100px', resize: 'vertical' }}
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                required
              ></textarea>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                  <span>📞</span> Nomor Telepon
                </label>
                <input 
                  type="text" 
                  placeholder="+62 812..."
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                  <span>📁</span> Kategori Utama
                </label>
                <input 
                  type="text" 
                  placeholder="Cth: Electronics Repair"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                <span>🌐</span> Website URL
              </label>
              <input 
                type="url" 
                placeholder="https://baliphonerepair.com"
                value={formData.website}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
              />
            </div>
            
            <div style={{ paddingTop: '1rem' }}>
              <button 
                type="submit" 
                disabled={loading || syncing}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', height: '52px', fontSize: '1rem', borderRadius: '12px' }}
              >
                {loading ? 'Menyimpan Profil...' : 'Kunci Profil Bisnis'}
              </button>
            </div>
          </form>
        </div>

        {/* Sync Status Card */}
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          <div style={{ padding: '2rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(to right, rgba(0,0,0,0.2), rgba(0,0,0,0))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Radar Sinkronisasi</h2>
              {profile && profile.syncStatus === 'COMPLETED' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.85rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.2)', boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)' }}>
                  <span style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%' }}></span> 100% ONLINE
                </span>
              ) : profile && (profile.syncStatus === 'SYNCING' || syncing) ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.85rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <span style={{ width: 14, height: 14, border: '2px solid #f59e0b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span> MENYIARKAN...
                </span>
              ) : (
                <span style={{ padding: '0.35rem 0.85rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, border: '1px solid var(--border)' }}>MENUNGGU</span>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Jaringan peta dan agregator data yang terhubung dengan sistem AI dan mesin pencari lokal.</p>
          </div>
          
          <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', flex: 1 }}>
              {directories.map((dir, i) => {
                const isCompleted = profile && profile.syncStatus === 'COMPLETED';
                const isSyncing = profile && (profile.syncStatus === 'SYNCING' || syncing);
                
                return (
                  <div key={i} style={{ 
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', 
                    border: '1px solid',
                    borderColor: isCompleted ? 'rgba(16, 185, 129, 0.2)' : isSyncing ? 'rgba(245, 158, 11, 0.2)' : 'var(--border)',
                    borderRadius: '12px', 
                    background: isCompleted ? 'rgba(16, 185, 129, 0.03)' : isSyncing ? 'rgba(245, 158, 11, 0.03)' : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ 
                      width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(255,255,255,0.05)', color: dir.color, fontSize: '1.25rem', fontWeight: 800,
                      boxShadow: `0 4px 10px ${dir.color}20`
                    }}>
                      {dir.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>{dir.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {isCompleted ? 'Profil Aktif & Terindeks' : isSyncing ? 'Mengirim Data Profil...' : 'Menunggu Siaran'}
                      </div>
                    </div>
                    <div style={{ paddingRight: '0.5rem' }}>
                      {isCompleted ? (
                         <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✓</div>
                      ) : isSyncing ? (
                         <div style={{ display: 'flex', gap: '3px' }}>
                           <span style={{ width: 6, height: 6, background: '#f59e0b', borderRadius: '50%', animation: 'pulse 1.5s infinite 0s' }}></span>
                           <span style={{ width: 6, height: 6, background: '#f59e0b', borderRadius: '50%', animation: 'pulse 1.5s infinite 0.2s' }}></span>
                           <span style={{ width: 6, height: 6, background: '#f59e0b', borderRadius: '50%', animation: 'pulse 1.5s infinite 0.4s' }}></span>
                         </div>
                      ) : (
                         <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border)' }}></div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <button 
              onClick={handleSync}
              disabled={!profile || syncing || profile.syncStatus === 'SYNCING'}
              style={{ 
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', 
                height: '56px', borderRadius: '12px', fontSize: '1rem', fontWeight: 700,
                background: (!profile || syncing || (profile && profile.syncStatus === 'SYNCING')) ? 'rgba(255,255,255,0.1)' : 'var(--text)', 
                color: (!profile || syncing || (profile && profile.syncStatus === 'SYNCING')) ? 'var(--text-muted)' : 'var(--bg)',
                border: 'none', cursor: (!profile || syncing || (profile && profile.syncStatus === 'SYNCING')) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: (!profile || syncing || (profile && profile.syncStatus === 'SYNCING')) ? 'none' : '0 10px 25px rgba(255,255,255,0.15)'
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>📡</span> 
              {profile && profile.syncStatus === 'COMPLETED' ? 'Sinkronisasi Ulang (Update)' : 'Mulai Siarkan Profil Bisnis'}
            </button>
            {!profile && <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.75rem' }}>*Kunci profil bisnis Anda terlebih dahulu di sebelah kiri.</p>}
          </div>
        </div>

      </div>
    </div>
  )
}
