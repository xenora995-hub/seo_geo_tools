'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import api from '@/lib/api'

function RankTrackerContent() {
  const searchParams = useSearchParams()
  const tenantIdQuery = searchParams.get('tenantId')

  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [newLocation, setNewLocation] = useState('Jakarta')

  useEffect(() => {
    fetchProjects()
  }, [tenantIdQuery])

  const fetchProjects = async () => {
    try {
      const userStr = localStorage.getItem('user')
      let tenantId = userStr ? JSON.parse(userStr).tenantId : ''
      if (!tenantId && tenantIdQuery) tenantId = tenantIdQuery
      
      const query = tenantId ? `?tenantId=${tenantId}` : ''
      
      const res = await api.get(`/api/rank-tracker/projects${query}`)
      if (res.data.success) {
        setProjects(res.data.data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDomain) return
    
    try {
      const userStr = localStorage.getItem('user')
      let tenantId = userStr ? JSON.parse(userStr).tenantId : ''
      if (!tenantId && tenantIdQuery) tenantId = tenantIdQuery

      const res = await api.post(`/api/rank-tracker/projects`, {
        domain: newDomain, 
        location: newLocation, 
        tenantId
      })
      
      if (res.data.success) {
        setShowModal(false)
        setNewDomain('')
        fetchProjects()
      }
    } catch (error) {
      console.error(error)
      alert('Gagal menyimpan proyek. Pastikan Anda sudah login dan memiliki akses.')
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">📈 Pelacak Peringkat Geo-Targeted</h1>
          <p className="text-gray-500 text-sm">Pantau pergerakan ranking domain Anda pada lokasi spesifik.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm flex items-center gap-2"
        >
          <span>+</span> Tambah Proyek
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-gray-200 shadow-sm text-center">
          <div className="text-4xl mb-4">📍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Proyek</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">Mulai pantau peringkat website Anda di hasil pencarian Google berdasarkan lokasi kota tertentu.</p>
          <button 
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
          >
            Buat Proyek Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 truncate" title={project.domain}>{project.domain}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                    <span>📍</span> {project.location}
                  </div>
                </div>
                <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100 mt-4">
                <div className="text-sm text-gray-500 flex justify-between">
                  <span>Keywords Dipantau:</span>
                  <span className="font-medium text-gray-900">0</span>
                </div>
                <div className="text-sm text-gray-500 flex justify-between mt-2">
                  <span>Rata-rata Posisi:</span>
                  <span className="font-medium text-gray-900">-</span>
                </div>
              </div>
              
              <button className="w-full mt-5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200">
                Lihat Detail Peringkat
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Tambah Proyek Baru</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem' }}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAddProject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Domain Website</label>
                <input 
                  type="text" 
                  placeholder="contoh: baliphonerepair.com" 
                  required
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                />
              </div>
              <div>
                <label>Lokasi Target (Kota)</label>
                <input 
                  type="text" 
                  placeholder="contoh: Bali" 
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Simpan Proyek
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RankTrackerPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RankTrackerContent />
    </Suspense>
  )
}
