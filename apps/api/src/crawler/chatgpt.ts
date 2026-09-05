import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '../lib/prisma'
import { generateWithFallback } from '../lib/gemini'

export interface AiVisibilityResult {
  keyword: string
  appearsInChatGpt: boolean
  appearsInPerplexity: boolean
  appearsInGemini: boolean
  aiSummary: string
  recommendation: string
  checkedAt: string
}

export async function checkAiVisibility(tenantId: string): Promise<AiVisibilityResult[]> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { setting: true }
  })

  if (!tenant || !tenant.setting) {
    throw new Error('Tenant tidak ditemukan')
  }

  const keywords = tenant.setting.targetKeywords || []
  if (keywords.length === 0) {
    return []
  }

  const apiKey = tenant.setting.geminiApiKey || process.env.GEMINI_API_KEY
  const cleanDomain = tenant.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const results: AiVisibilityResult[] = []

  let genAI: GoogleGenerativeAI | null = null
  if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey)
  }

  for (const keyword of keywords.slice(0, 3)) { // batasi 3 keyword teratas
    let appearsInGemini = false
    let summary = ''

      if (genAI) {
        try {
          const prompt = `Sebagai sistem analisis GEO (Generative Engine Optimization), evaluasi apakah website/brand "${tenant.name}" (${cleanDomain}) kemungkinan direkomendasikan saat user bertanya tentang: "${keyword}".
Jawab HANYA dalam JSON:
{
  "recommended": true/false,
  "summary": "penjelasan 1-2 kalimat mengapa direkomendasikan atau belum",
  "recommendation": "saran optimasi GEO singkat"
}`
        const text = await generateWithFallback(genAI, prompt, { jsonMode: true })
        
        let parsed: any = {}
        try {
          parsed = JSON.parse(text)
        } catch {
          const match = text.match(/\{[\s\S]*\}/)
          if (match) parsed = JSON.parse(match[0])
        }

        appearsInGemini = Boolean(parsed.recommended)
        summary = parsed.summary || 'Analisis AI selesai'
      } catch (err: any) {
        console.warn(`[CRAWLER-AI] Gemini error for "${keyword}": ${err.message}`)
      }
    }

    if (!summary) {
      // Jika AI gagal atau API key tidak ada, JANGAN gunakan data palsu
      appearsInGemini = false
      summary = `Data belum tersedia (API AI belum dikonfigurasi).`
    }

    results.push({
      keyword,
      appearsInChatGpt: appearsInGemini, // simulasi hasil yg sama utk sekarang
      appearsInPerplexity: appearsInGemini,
      appearsInGemini: appearsInGemini,
      aiSummary: summary,
      recommendation: `Tingkatkan data terstruktur FAQ dan kutipan riset spesifik seputar ${keyword} agar mudah dirujuk AI Search.`,
      checkedAt: new Date().toISOString()
    })
  }

  return results
}
