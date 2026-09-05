'use client'
import { useEffect } from 'react'

export default function RootPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (token) {
        window.location.replace('/dashboard')
      } else {
        window.location.replace('/login')
      }
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Memuat SEO/GEO Tools...
      </div>
    </div>
  )
}
