import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { generateWithFallback } from '../lib/gemini'

export const nicheFinderRouter = Router()
const prisma = new PrismaClient()

nicheFinderRouter.post('/discover', async (req, res) => {
  try {
    const { tenantId, region, baseKeyword } = req.body

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' })
    }

    // Ambil API Key dari pengaturan tenant
    const setting = await prisma.tenantSetting.findUnique({
      where: { tenantId }
    })

    if (!setting || !setting.geminiApiKey) {
      return res.status(400).json({ error: 'Kunci API Gemini belum diatur di menu Pengaturan.' })
    }

    // Ambil Niche yang sudah diklaim oleh tenant ini
    const claimedNiches = await prisma.claimedNiche.findMany({
      where: { tenantId },
      select: { name: true }
    })
    const claimedList = claimedNiches.map(c => c.name).join(', ')
    const claimedInstruction = claimedList.length > 0 
      ? `\n\nSANGAT PENTING: JANGAN rekomendasikan niche-niche berikut ini karena sudah kami pakai/klaim: ${claimedList}`
      : ''

    const genAI = new GoogleGenerativeAI(setting.geminiApiKey)

    const langInstruction = region === 'global' ? 'IMPORTANT: ALL OUTPUT MUST BE IN ENGLISH.' : 'PENTING: SEMUA OUTPUT HARUS DALAM BAHASA INDONESIA.'
    const focusInstruction = baseKeyword 
      ? `menganalisis dan memberikan 10 saran "Micro-Niche" (Topik Spesifik Turunan) yang masih berhubungan kuat dengan bidang bisnis / kata kunci dasar: "${baseKeyword}".`
      : `menganalisis dan memberikan 10 saran "Niche" (Topik Blog) yang sangat menguntungkan untuk AdSense.`

    const prompt = `Anda adalah seorang pakar SEO dan spesialis monetisasi berpengalaman.
Tugas Anda adalah ${focusInstruction}
Fokuskan pada wilayah: ${region === 'global' ? 'Global (Internasional/Amerika Serikat)' : 'Indonesia (Lokal)'}.${claimedInstruction}

${langInstruction}

Syarat Niche:
1. Memiliki estimasi CPC (Cost Per Click) AdSense yang tinggi.
2. Tingkat persaingan SEO masih bisa ditembus oleh blog baru (Low/Medium competition).
3. Sangat cocok untuk dibuatkan artikel massal.
4. PENTING: Urutkan hasil dari No. 1 (Paling Direkomendasikan / Paling Cuan) hingga No. 10 (Rekomendasi Terakhir).
5. Berikan rekomendasi Nama Blog dan Alamat URL Blog (misal nama-blog.blogspot.com atau namablog.com) yang SEO-friendly.

WAJIB HANYA membalas dengan format JSON murni tanpa markdown, tanpa penjelasan tambahan. Skema JSON harus seperti ini:
{
  "niches": [
    {
      "name": "Nama Niche (Contoh: Asuransi Kendaraan)",
      "description": "Alasan singkat mengapa niche ini bagus untuk AdSense",
      "cpcLevel": "Tinggi" | "Sangat Tinggi" | "Menengah",
      "competition": "Rendah" | "Sedang",
      "targetAudience": "Deskripsi audiens",
      "blogName": "Rekomendasi Nama Blog (contoh: Info Asuransi Cepat)",
      "blogAddress": "Rekomendasi Alamat Blog (contoh: infoasuransicepat.blogspot.com)",
      "longTailKeywords": ["keyword panjang 1", "keyword panjang 2", "keyword panjang 3"]
    }
  ]
}`

    const text = await generateWithFallback(genAI, prompt, { jsonMode: true })

    let parsedData
    try {
      // Membersihkan markdown JSON jika AI secara tidak sengaja menambahkannya
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim()
      parsedData = JSON.parse(cleanText)
    } catch (e) {
      // Fallback
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        parsedData = JSON.parse(match[0])
      } else {
        throw new Error('Format balasan AI tidak sesuai.')
      }
    }

    res.json({ success: true, data: parsedData.niches })
  } catch (error: any) {
    console.error('[Niche Finder Error]', error)
    
    let errorMessage = error.message || 'Gagal mencari ide niche.'
    if (errorMessage.includes('429 Too Many Requests') || errorMessage.includes('Quota exceeded')) {
      errorMessage = 'Peringatan: Limit API Gemini Anda (Requests Per Minute/Day) telah habis. Silakan tunggu sekitar 1-2 menit sebelum mencoba lagi, atau gunakan API Key Gemini berbayar/baru.'
    }
    
    res.status(500).json({ success: false, error: errorMessage })
  }
})

// Endpoint untuk melakukan Klaim Niche
nicheFinderRouter.post('/claim', async (req, res) => {
  try {
    const { tenantId, name } = req.body

    if (!tenantId || !name) {
      return res.status(400).json({ error: 'tenantId dan name diperlukan' })
    }

    // Cek apakah sudah diklaim oleh tenant ini
    const existing = await prisma.claimedNiche.findFirst({
      where: { 
        tenantId,
        name 
      }
    })

    if (existing) {
      return res.status(400).json({ error: 'Niche ini sudah diklaim sebelumnya.' })
    }

    const claimed = await prisma.claimedNiche.create({
      data: {
        tenantId,
        name
      }
    })

    res.json({ success: true, data: claimed })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})
