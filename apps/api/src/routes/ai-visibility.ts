import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, getTenantId } from '../auth/middleware'
import { pingIndexNow } from '../publisher/indexer'
import { runAiDiscoveryTest, getAiVisibilityHistory } from '../crawler/chatgpt'
import { MAIN_BRAND_INFO, buildParentAndBranchesSchema } from '../data/business-branches'

export const aiVisibilityRouter = Router()
aiVisibilityRouter.use(requireAuth)

/**
 * GET /api/ai-visibility
 * Menampilkan ringkasan status visibilitas AI berdasarkan fakta riwayat pengujian
 */
aiVisibilityRouter.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        setting: true,
        branches: true,
        articles: {
          where: { status: 'PUBLISHED' },
          select: { id: true, title: true, keywords: true, cmsPostUrl: true, publishedAt: true },
          orderBy: { publishedAt: 'desc' }
        }
      }
    })

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant tidak ditemukan' })
    }

    // Ambil riwayat pengujian sebenarnya dari database
    const runs = await prisma.aiVisibilityTestRun.findMany({
      where: { tenantId },
      orderBy: { testedAt: 'desc' },
      take: 50
    })

    // Hitung metrik riil (tanpa mengarang angka)
    const totalRuns = runs.length
    const citedRuns = runs.filter(r => r.status === 'cited').length
    const mentionedRuns = runs.filter(r => r.status === 'mentioned').length
    const notFoundRuns = runs.filter(r => r.status === 'not_found_in_run').length
    const errorRuns = runs.filter(r => r.status === 'error').length

    // Hitung citation rate riil
    const citationRate = totalRuns > 0 ? Math.round((citedRuns / totalRuns) * 100) : 0

    res.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          domain: tenant.domain,
          cmsUrl: tenant.cmsUrl
        },
        metrics: {
          totalRuns,
          citedRuns,
          mentionedRuns,
          notFoundRuns,
          errorRuns,
          citationRatePercent: citationRate,
          lastTestedAt: runs.length > 0 ? runs[0].testedAt : null
        },
        branchesCount: tenant.branches.length,
        publishedArticlesCount: tenant.articles.length,
        targetKeywords: tenant.setting?.targetKeywords || [],
        recentRuns: runs.slice(0, 15),
        branches: tenant.branches
      }
    })
  } catch (error: any) {
    console.error('[AI-VISIBILITY ERROR]', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

/**
 * GET /api/ai-visibility/runs
 * Riwayat lengkap hasil audit AI dengan status eksplisit
 */
aiVisibilityRouter.get('/runs', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' })

    const runs = await getAiVisibilityHistory(tenantId)
    res.json({ success: true, data: runs })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

/**
 * POST /api/ai-visibility/test-run
 * Menjalankan uji pencarian AI alami tanpa menyuntikkan nama brand/domain ke prompt
 */
aiVisibilityRouter.post('/test-run', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req) || req.body.tenantId
    const query = req.body.query as string

    if (!tenantId || !query) {
      return res.status(400).json({ success: false, message: 'tenantId dan query pertanyaan diperlukan' })
    }

    console.log(`[AI-VISIBILITY] Menjalankan uji netral discovery: "${query}"`)
    const result = await runAiDiscoveryTest({
      tenantId,
      query: query.trim(),
      provider: 'GEMINI_SEARCH_GROUNDING'
    })

    res.json({ success: true, data: result })
  } catch (error: any) {
    console.error('[TEST-RUN ERROR]', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

/**
 * POST /api/ai-visibility/manual-log
 * Mencatat hasil pengujian manual dari ChatGPT App
 */
aiVisibilityRouter.post('/manual-log', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req) || req.body.tenantId
    const { query, model, status, brandMentioned, domainCited, citationUrls, responseText, evidenceNotes, testedAt } = req.body

    if (!tenantId || !query || !status) {
      return res.status(400).json({ success: false, message: 'tenantId, query, dan status diperlukan' })
    }

    const validStatuses = ['not_checked', 'mentioned', 'cited', 'not_found_in_run', 'error']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Status tidak valid. Harus salah satu dari: ${validStatuses.join(', ')}` })
    }

    const created = await prisma.aiVisibilityTestRun.create({
      data: {
        tenantId,
        query: String(query).trim(),
        sourceType: 'MANUAL_CHATGPT_APP',
        model: model || 'ChatGPT App (Manual User Test)',
        status,
        brandMentioned: Boolean(brandMentioned),
        domainCited: Boolean(domainCited),
        domainInSources: Boolean(domainCited),
        citationUrls: Array.isArray(citationUrls) ? citationUrls : [],
        responseText: responseText || 'Manual test recorded via dashboard.',
        evidenceNotes: evidenceNotes || null,
        isLegacySimulation: false,
        testedAt: testedAt ? new Date(testedAt) : new Date()
      }
    })

    res.json({ success: true, data: created, message: 'Hasil tes ChatGPT App berhasil dicatat!' })
  } catch (error: any) {
    console.error('[MANUAL-LOG ERROR]', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

/**
 * GET /api/ai-visibility/branches
 * Menampilkan data cabang terverifikasi untuk tenant
 */
aiVisibilityRouter.get('/branches', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' })

    const branches = await prisma.branchProfile.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    })

    const schemaSnippet = buildParentAndBranchesSchema()

    res.json({
      success: true,
      data: {
        mainBrand: MAIN_BRAND_INFO.name,
        headOffice: MAIN_BRAND_INFO.headOfficeAddress,
        branches,
        schemaSnippet
      }
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

/**
 * POST /api/ai-visibility/push-indexnow
 * Mengirim seluruh artikel terbit ke IndexNow (Bing & ChatGPT Search)
 */
aiVisibilityRouter.post('/push-indexnow', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req) || req.body.tenantId
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' })

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        articles: {
          where: { status: 'PUBLISHED', cmsPostUrl: { not: null } },
          select: { cmsPostUrl: true }
        }
      }
    })

    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant tidak ditemukan' })

    const urls = tenant.articles.map(a => a.cmsPostUrl).filter((u): u is string => Boolean(u))
    if (urls.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada URL artikel untuk disubmit.' })
    }

    const results = await pingIndexNow({
      host: tenant.domain,
      urlList: urls
    })

    res.json({
      success: true,
      message: `Berhasil mengirim ${urls.length} artikel ke IndexNow (Bing & ChatGPT Search)`,
      submittedUrlsCount: urls.length,
      engineResults: results
    })
  } catch (error: any) {
    console.error('[INDEXNOW ERROR]', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

/**
 * GET /api/ai-visibility/top5-analysis
 * Analisis diagnostik khusus: Mengapa web dikutip di sumber tetapi belum masuk 5 besar rekomendasi toko
 */
aiVisibilityRouter.get('/top5-analysis', async (req: Request, res: Response) => {
  try {
    const analysis = {
      screenshotEvidence: {
        query: 'bali phone repair / servis HP di Bali (Denpasar)',
        citationStatus: 'CITED_AS_PRIMARY_SOURCE',
        actualRole: 'ALTERNATIVE_FOOTNOTE',
        verbatimQuote: 'Kalau kamu nggak mau datang ke toko, Bali Phone Repair juga menyediakan mobile repair ke villa/hotel/lokasi kamu di Bali',
        sourceRank: '#1 in Sources Box'
      },
      top5CompetitorsAnalyzed: [
        { name: 'DEWATA REPAIR PANJER', location: 'Panjer, Denpasar Selatan', whyWon: 'Physical storefront with explicit closing time: buka sampai 22:00' },
        { name: 'Dewata Repair Teuku Umar', location: 'Teuku Umar Barat', whyWon: 'Prime tech strip (Teuku Umar) + buka sampai 22:00' },
        { name: 'iColor Bali', location: 'Imam Bonjol, Denpasar', whyWon: 'Physical storefront + buka sampai 22:00' },
        { name: 'iFixied Apple Service Bali Denpasar', location: 'Teuku Umar', whyWon: 'Specific Apple branding + Teuku Umar corridor' },
        { name: 'Cellular World', location: 'Teuku Umar', whyWon: 'High brand recognition on Teuku Umar + buka sampai 22:00' }
      ],
      rootCauseWhyNotTop5: [
        {
          factor: 'Klasifikasi Entitas Toko Fisik vs Layanan Panggilan',
          explanation: 'Situs baliphonerepair.com saat ini terlalu menonjolkan "Service HP Panggilan / Mobile Repair ke Villa". Akibatnya, ChatGPT mengklasifikasikan Bali Phone Repair sebagai "Alternatif jika Anda TIDAK mau datang ke toko", bukan toko fisik utama yang bisa dikunjungi hari ini.'
        },
        {
          factor: 'Absennya Cabang Jl. Teuku Umar di Website',
          explanation: '3 dari 5 toko yang direkomendasikan ChatGPT berada di Jl. Teuku Umar. Bali Phone Repair memiliki cabang resmi iSmart Teuku Umar (Jl. Teuku Umar No. 241), tetapi nama dan alamat ini sama sekali tidak ada di website, sehingga ChatGPT tidak tahu Bali Phone Repair punya toko di sentra gadget tersebut.'
        },
        {
          factor: 'Ketiadaan Sinyal Jam Buka Toko (Opening Hours) di Mesin Pencari',
          explanation: 'ChatGPT menyaring rekomendasi dengan kriteria "sedang buka hari ini (buka sampai 22:00)". Tanpa Schema openingHoursSpecification dan jam operasional toko yang jelas di beranda, website kalah bersaing dengan listing yang mencantumkan jam tutup malam.'
        }
      ],
      actionPillarsToWinTop5: [
        {
          step: 1,
          title: 'Integrasikan Cabang iSmart Teuku Umar & Bale Bali di Homepage',
          impact: 'Menjadikan Bali Phone Repair relevan secara geografis di sentra Jl. Teuku Umar berdampingan dengan Dewata Repair dan iFixied.'
        },
        {
          step: 2,
          title: 'Ubah Positioning Hero: Dual Authority (Toko Fisik Buka s/d 21:00/22:00 + Mobile Villa)',
          impact: 'Menghilangkan label "hanya alternatif mobile" dan menempatkan brand sebagai opsi nomor satu untuk datang langsung maupun panggilan.'
        },
        {
          step: 3,
          title: 'Sematkan Schema OpeningHoursSpecification & LocalBusiness Multi-Branch',
          impact: 'Memberi sinyal terstruktur ke crawler Bing/ChatGPT bahwa workshop buka setiap hari sampai malam.'
        }
      ]
    }

    res.json({ success: true, data: analysis })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

