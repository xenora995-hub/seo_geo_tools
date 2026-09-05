'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) setUser(JSON.parse(u))

    api.get('/api/articles?limit=1')
      .then(res => {
        setStats({
          total: res.data.pagination?.total || 0,
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const quickActions = [
    {
      title: 'Langkah 1: Hubungkan Website',
      description: 'Atur alamat website Anda dan masukkan kunci AI agar sistem bisa mulai menulis artikel.',
      icon: '⚙️',
      href: '/dashboard/settings',
      color: 'rgba(99, 102, 241, 0.15)',
      borderColor: 'rgba(99, 102, 241, 0.4)',
    },
    {
      title: 'Langkah 2: Coba Tulis Manual',
      description: 'Uji coba membuat satu artikel dengan kata kunci pilihan Anda untuk melihat hasilnya.',
      icon: '✨',
      href: '/dashboard/generate',
      color: 'rgba(168, 85, 247, 0.15)',
      borderColor: 'rgba(168, 85, 247, 0.4)',
    },
    {
      title: 'Langkah 3: Aktifkan Robot Penulis',
      description: 'Biarkan sistem menulis artikel secara otomatis setiap hari tanpa perlu Anda suruh.',
      icon: '🤖',
      href: '/dashboard/schedules',
      color: 'rgba(16, 185, 129, 0.15)',
      borderColor: 'rgba(16, 185, 129, 0.4)',
    },
    {
      title: 'Langkah 4: Pantau Hasil SEO',
      description: 'Lihat apakah artikel Anda sudah masuk halaman 1 Google dan pantau performa website.',
      icon: '📈',
      href: '/dashboard/reports',
      color: 'rgba(245, 158, 11, 0.15)',
      borderColor: 'rgba(245, 158, 11, 0.4)',
    }
  ]

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Banner Utama */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(15,23,42,0.6) 100%)',
        border: '1px solid rgba(99,102,241,0.3)',
        marginBottom: '2.5rem',
        textAlign: 'center',
        padding: '3rem 2rem'
      }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Selamat Datang di Pusat Kontrol SEO Anda! 🚀
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text)', maxWidth: 700, margin: '0 auto', lineHeight: 1.6 }}>
          Halo <strong>{user?.name || 'Admin'}</strong>! Sistem ini dirancang untuk bekerja secara mandiri layaknya penulis SEO profesional. Cukup atur satu kali, dan biarkan robot kami yang bekerja mengisi website Anda setiap hari.
        </p>
        
        {stats?.total > 0 && (
          <div style={{ marginTop: '2rem', display: 'inline-block', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '0.75rem 1.5rem', borderRadius: 999 }}>
            🎉 Website Anda telah mempublikasikan <strong>{stats.total} artikel</strong>.
          </div>
        )}
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Pilih Tindakan Cepat (Ikuti Sesuai Urutan):</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
        {quickActions.map(action => (
          <Link href={action.href} key={action.title} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              background: 'var(--surface)',
              borderLeft: `4px solid ${action.borderColor}`,
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem', background: action.color, width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16 }}>
                {action.icon}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.5rem' }}>
                {action.title}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                {action.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
