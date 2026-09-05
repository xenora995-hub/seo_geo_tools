import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { generateWithFallback } from '../lib/gemini'

export const backlinksRouter = Router()
const prisma = new PrismaClient()

backlinksRouter.get('/analyze', async (req, res) => {
  try {
    const { domain, tenantId } = req.query
    if (!domain || !tenantId) return res.status(400).json({ error: 'Domain and tenantId required' })

    const domainStr = String(domain)
    
    let apiKey = process.env.GEMINI_API_KEY
    if (tenantId !== 'dummy-tenant-id') {
      const setting = await prisma.tenantSetting.findUnique({
        where: { tenantId: String(tenantId) }
      })
      if (setting && setting.geminiApiKey) {
        apiKey = setting.geminiApiKey
      }
    }

    if (!apiKey) {
      if (tenantId === 'dummy-tenant-id') {
        // Fallback untuk mode uji coba super admin
        return res.json({
          success: true,
          data: {
            profile: { domainRating: 45, totalBacklinks: 12500, referringDomains: 340 },
            recentLinks: [
              { id: 1, url: 'https://medium.com', domainRating: 94, anchorText: 'Platform Blog', isDofollow: true, category: 'Blogging', strategy: 'Tulis artikel dan sisipkan backlink' },
              { id: 2, url: 'https://quora.com', domainRating: 91, anchorText: 'Q&A', isDofollow: false, category: 'Forum', strategy: 'Jawab pertanyaan relevan' }
            ]
          }
        })
      }
      return res.status(400).json({ error: 'Kunci API Gemini belum diatur di menu Pengaturan.' })
    }

    const genAI = new GoogleGenerativeAI(apiKey)

    const prompt = `Anda adalah seorang pakar GEO (Generative Engine Optimization) dan SEO Link Building.
Tugas Anda adalah:
1. Menganalisis domain: "${domainStr}" untuk menebak apa topik utama atau industrinya.
2. Memberikan estimasi "Domain Rating" (DR), estimasi "Total Backlinks", dan estimasi "Referring Domains" yang kira-kira masuk akal untuk industri tersebut sebagai profil referensi.
3. Menemukan 5 PLATFORM atau WEBSITE TERBAIK yang sangat sering dijadikan SUMBER REFERENSI oleh ChatGPT/AI (misalnya forum, situs direktori industri, media berita, portal spesifik, platform Q&A seperti Quora/Reddit/Medium/dsb) yang sangat cocok untuk domain "${domainStr}".
4. Berikan saran/strategi singkat ("strategy") yang dapat ditindaklanjuti tentang BAGAIMANA pengguna bisa menaruh link/mention website mereka di platform tersebut.
5. Berikan "tutorial" yakni 3 hingga 5 langkah teknis yang jelas (array of strings) tentang cara mengeksekusi strategi tersebut di platform yang bersangkutan (misal: "1. Kunjungi website X", "2. Klik daftar", dll).

HANYA BERIKAN OUTPUT DALAM FORMAT JSON MURNI (tanpa markdown). Struktur JSON wajib seperti ini:
{
  "profile": {
    "domainRating": 40,
    "totalBacklinks": 5000,
    "referringDomains": 120
  },
  "recentLinks": [
    {
      "url": "https://www.quora.com",
      "domainRating": 91,
      "category": "Forum Diskusi",
      "strategy": "Cari pertanyaan yang sering ditanyakan seputar industri Anda dan jawab dengan detail.",
      "tutorial": [
        "1. Kunjungi www.quora.com dan buat akun gratis menggunakan profil asli Anda.",
        "2. Cari kata kunci terkait bisnis Anda di kotak pencarian.",
        "3. Pilih pertanyaan terbaru atau yang paling banyak diikuti.",
        "4. Tulis jawaban panjang yang informatif, dan sisipkan nama atau link website Anda sebagai referensi."
      ]
    }
  ]
}`

    const text = await generateWithFallback(genAI, prompt, { jsonMode: true })

    let parsedData
    try {
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim()
      parsedData = JSON.parse(cleanText)
    } catch (e) {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        parsedData = JSON.parse(match[0])
      } else {
        throw new Error('Format balasan AI tidak sesuai.')
      }
    }

    // Simpan hasil ke GeoBacklinkTask jika tenantId valid
    if (tenantId !== 'dummy-tenant-id' && parsedData.recentLinks && Array.isArray(parsedData.recentLinks)) {
      for (const link of parsedData.recentLinks) {
        // Cek apakah tugas untuk domain & url ini sudah ada agar tidak ganda
        const existingTask = await prisma.geoBacklinkTask.findFirst({
          where: { tenantId: String(tenantId), domain: domainStr, targetUrl: link.url }
        })
        if (!existingTask) {
          await prisma.geoBacklinkTask.create({
            data: {
              tenantId: String(tenantId),
              domain: domainStr,
              targetUrl: link.url,
              domainRating: link.domainRating || 0,
              category: link.category || 'Website',
              strategy: link.strategy || '',
              tutorial: link.tutorial || [],
              status: 'PENDING'
            }
          })
        }
      }
    }

    res.json({ success: true, data: parsedData })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: 'Analysis failed' })
  }
})

// Endpoint untuk mengambil daftar tugas Backlink
backlinksRouter.get('/tasks', async (req, res) => {
  try {
    const { tenantId, domain } = req.query
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' })
    
    let whereClause: any = { tenantId: String(tenantId) }
    if (domain) {
      whereClause.domain = String(domain)
    }
    
    const tasks = await prisma.geoBacklinkTask.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    })
    
    res.json({ success: true, data: tasks })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: 'Gagal mengambil tugas backlink' })
  }
})

// Endpoint untuk memperbarui status tugas Backlink
backlinksRouter.put('/tasks/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    
    if (status !== 'PENDING' && status !== 'DONE') {
      return res.status(400).json({ error: 'Status tidak valid' })
    }
    
    const updated = await prisma.geoBacklinkTask.update({
      where: { id },
      data: { status }
    })
    
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: 'Gagal memperbarui status tugas' })
  }
})
