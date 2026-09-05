'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const navItems = [
  { href: '/dashboard', label: 'Beranda', icon: '🏠' },
  { href: '/dashboard/articles', label: 'Daftar Artikel', icon: '📝' },
  { href: '/dashboard/generate', label: 'Buat Artikel', icon: '✨' },
  { href: '/dashboard/schedules', label: 'Jadwal Otomatis', icon: '🕐' },
  { href: '/dashboard/reports', label: 'Laporan SEO', icon: '📊' },
  { href: '/dashboard/keyword-research', label: 'Riset Kata Kunci', icon: '🔍' },
  { href: '/dashboard/rank-tracker', label: 'Pelacak Peringkat', icon: '📈' },
  { href: '/dashboard/client-reports', label: 'Laporan Klien', icon: '💌' },
  { href: '/dashboard/site-audit', label: 'Audit Situs', icon: '🩺' },
  { href: '/dashboard/content-gap', label: 'Celah Konten', icon: '🎯' },
  { href: '/dashboard/backlinks', label: 'Analisis Backlink', icon: '🔗' },
  { href: '/dashboard/local-listing', label: 'Direktori Lokal', icon: '📍' },
  { href: '/dashboard/seo-writing', label: 'SEO Writer', icon: '✍️' },
  { href: '/dashboard/niche-finder', label: 'Niche Finder', icon: '💡' },
  { href: '/dashboard/settings', label: 'Pengaturan', icon: '⚙️' },
]

const superuserNav = [
  { href: '/dashboard/tenants', label: 'Kelola Website', icon: '🌐' },
  { href: '/dashboard/users', label: 'Kelola User', icon: '👥' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [tenants, setTenants] = useState<any[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token) { router.push('/login'); return }
    
    if (userData) {
      const u = JSON.parse(userData)
      setUser(u)
      
      // Jika Superuser, ambil data semua tenant
      if (u.role === 'SUPERUSER') {
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/tenants`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
          if (data.data && data.data.length > 0) {
            setTenants(data.data)
            const urlParams = new URLSearchParams(window.location.search)
            const queryTenantId = urlParams.get('tenantId')
            
            if (queryTenantId && data.data.some((t: any) => t.id === queryTenantId)) {
               setSelectedTenantId(queryTenantId)
            } else {
               setSelectedTenantId(data.data[0].id)
            }
          }
        })
        .catch(console.error)
      }
    }
  }, [])

  const handleTenantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value
    setSelectedTenantId(newId)
    // Update URL agar page re-render atau ngambil data baru
    router.push(`${pathname}?tenantId=${newId}`)
  }

  const logout = () => {
    localStorage.clear()
    router.push('/login')
  }

  return (
    <div style={{ display: 'flex' }}>
      <aside className="sidebar">
        <div style={{ padding: '0 1.5rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>🚀 SEO/GEO Tools</div>
          {user && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-light)', marginTop: '0.15rem' }}>
                {user.role === 'SUPERUSER' ? '⭐ Super Admin' : user.tenant?.name || 'Admin'}
              </div>
              
              {/* DROPDOWN KLIEN KHUSUS SUPERUSER */}
              {user.role === 'SUPERUSER' && tenants.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Kelola Website Klien:
                  </label>
                  <select 
                    value={selectedTenantId || ''} 
                    onChange={handleTenantChange}
                    style={{ 
                      width: '100%', 
                      padding: '0.4rem 0.5rem', 
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      fontSize: '0.8rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id} style={{ color: '#000' }}>
                        {t.domain}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <nav style={{ flex: 1, padding: '1rem 0', overflowY: 'auto' }}>
          {navItems.map(item => {
            const isSuperuserTool = user?.role === 'SUPERUSER' && item.href !== '/dashboard'
            const finalHref = isSuperuserTool && selectedTenantId ? `${item.href}?tenantId=${selectedTenantId}` : item.href
            
            return (
              <Link key={item.href} href={finalHref}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.6rem 1.5rem', fontSize: '0.875rem',
                  color: pathname === item.href ? 'var(--accent-light)' : 'var(--text-muted)',
                  background: pathname === item.href ? 'rgba(99,102,241,0.1)' : 'transparent',
                  borderLeft: pathname === item.href ? '3px solid var(--accent)' : '3px solid transparent',
                  textDecoration: 'none', transition: 'all 0.15s',
                }}>
                <span>{item.icon}</span> {item.label}
              </Link>
            )
          })}

          {user?.role === 'SUPERUSER' && (
            <>
              <div style={{ padding: '1rem 1.5rem 0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Super Admin
              </div>
              {superuserNav.map(item => (
                <Link key={item.href} href={item.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.6rem 1.5rem', fontSize: '0.875rem',
                    color: pathname === item.href ? 'var(--accent-light)' : 'var(--text-muted)',
                    background: pathname === item.href ? 'rgba(99,102,241,0.1)' : 'transparent',
                    borderLeft: pathname === item.href ? '3px solid var(--accent)' : '3px solid transparent',
                    textDecoration: 'none', transition: 'all 0.15s',
                  }}>
                  <span>{item.icon}</span> {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
          <button onClick={logout} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}>
            🚪 Keluar
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  )
}
