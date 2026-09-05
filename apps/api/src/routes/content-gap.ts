import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { generateContentGapKeywords } from '../generator/content-gap-ai'

export const contentGapRouter = Router()
const prisma = new PrismaClient()

contentGapRouter.post('/compare', async (req, res) => {
  try {
    let { myDomain, tenantId, niche, location } = req.body
    if (!myDomain) {
      return res.status(400).json({ error: 'myDomain is required' })
    }

    if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
      tenantId = 'dummy-tenant-id' // fallback
    }

    // Ambil API Key dari pengaturan tenant
    let apiKey = process.env.GEMINI_API_KEY
    let language = 'id'
    let targetKeywords: string[] = []

    if (tenantId !== 'dummy-tenant-id') {
      const setting = await prisma.tenantSetting.findUnique({
        where: { tenantId }
      })
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      })

      if (tenant?.language) {
        language = tenant.language
      }
      if (setting && setting.geminiApiKey) {
        apiKey = setting.geminiApiKey
      }
      if (!niche && setting?.businessNiche) {
        niche = setting.businessNiche
      }
      if (!location) {
        location = 'Bali, Indonesia'
      }
      if (setting?.targetKeywords && setting.targetKeywords.length > 0) {
        targetKeywords = setting.targetKeywords
      }
    }

    if (!apiKey) {
      if (tenantId === 'dummy-tenant-id') {
        // Fallback untuk super admin agar UI tetap bisa diuji coba tanpa API key
        return res.json({
          success: true,
          data: [
            { keyword: 'jasa seo lokal otomatis', volume: 1500, myRank: 0, competitors: [{ domain: 'kompetitor-ai-1.com', rank: 2 }, { domain: 'kompetitor-ai-2.com', rank: 5 }] },
            { keyword: 'cara rank halaman satu google', volume: 3200, myRank: 0, competitors: [{ domain: 'kompetitor-ai-1.com', rank: 1 }, { domain: 'kompetitor-ai-2.com', rank: 11 }] }
          ]
        })
      }
      return res.status(400).json({ error: 'Kunci API Gemini belum diatur di menu Pengaturan.' })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const gaps = await generateContentGapKeywords(genAI, myDomain, niche, location, language, targetKeywords)

    res.json({ success: true, data: gaps })
  } catch (error: any) {
    console.error('[Content Gap Error]', error)
    res.status(500).json({ success: false, error: error.message || 'Comparison failed' })
  }
})
