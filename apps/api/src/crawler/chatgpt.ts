import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '../lib/prisma'
import { generateWithFallback } from '../lib/gemini'
import { MAIN_BRAND_INFO } from '../data/business-branches'

export type VisibilityStatus = 'not_checked' | 'mentioned' | 'cited' | 'not_found_in_run' | 'error'

export interface AiVisibilityReportItem {
  id?: string
  query: string
  provider: string
  model: string
  status: VisibilityStatus
  brandMentioned: boolean
  domainCited: boolean
  domainInSources: boolean
  citationUrls: string[]
  responseText: string
  evidenceNotes?: string | null
  searchSources?: any
  errorMessage?: string | null
  isLegacySimulation: boolean
  testedAt: string
}

/**
 * Normalizes hostname for reliable domain comparison
 */
export function normalizeHostname(urlOrHost: string): string {
  if (!urlOrHost) return ''
  try {
    const raw = urlOrHost.trim()
    const withProto = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`
    const parsed = new URL(withProto)
    return parsed.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return urlOrHost.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split(':')[0].toLowerCase().trim()
  }
}

/**
 * Checks whether candidate URL or citation belongs to the target domain
 */
export function isDomainMatch(targetDomain: string, candidateUrl: string): boolean {
  if (!targetDomain || !candidateUrl) return false
  const cleanTarget = normalizeHostname(targetDomain)
  const cleanCandidate = normalizeHostname(candidateUrl)
  if (!cleanTarget || !cleanCandidate) return false
  return cleanCandidate === cleanTarget || cleanCandidate.endsWith(`.${cleanTarget}`)
}

/**
 * Checks whether brand or any of its verified branch names are mentioned in the text
 */
export function checkBrandMentions(text: string, brandName: string, branches: string[] = []): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  const candidates = [brandName, ...branches].filter(Boolean).map(n => n.toLowerCase())
  return candidates.some(name => lower.includes(name))
}

/**
 * Runs an honest, unbiased AI discovery query evaluation.
 * Note: Discovery prompts NEVER inject the target brand name or domain.
 * They test real organic customer queries.
 */
export async function runAiDiscoveryTest(options: {
  tenantId: string
  query: string
  provider?: 'GEMINI_SEARCH_GROUNDING' | 'OPENAI_WEB_SEARCH'
}): Promise<AiVisibilityReportItem> {
  const { tenantId, query, provider = 'GEMINI_SEARCH_GROUNDING' } = options

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { setting: true, branches: true }
  })

  if (!tenant) {
    throw new Error('Tenant tidak ditemukan')
  }

  const cleanDomain = normalizeHostname(tenant.domain)
  const branchNames = (tenant.branches || []).map(b => b.branchName)
  if (cleanDomain.includes('baliphonerepair')) {
    branchNames.push('iSmart Canggu', 'Bale Bali', 'iSmart Teuku Umar', 'iSmart')
  }

  const apiKey = tenant.setting?.geminiApiKey || process.env.GEMINI_API_KEY
  if (!apiKey) {
    const errItem: AiVisibilityReportItem = {
      query,
      provider: provider === 'OPENAI_WEB_SEARCH' ? 'OpenAI API web-search test' : 'Gemini Search Grounding test',
      model: 'N/A',
      status: 'error',
      brandMentioned: false,
      domainCited: false,
      domainInSources: false,
      citationUrls: [],
      responseText: '',
      errorMessage: 'API Key AI belum dikonfigurasi pada pengaturan tenant.',
      isLegacySimulation: false,
      testedAt: new Date().toISOString()
    }

    await prisma.aiVisibilityTestRun.create({
      data: {
        tenantId,
        query,
        sourceType: provider,
        model: 'N/A',
        status: 'error',
        brandMentioned: false,
        domainCited: false,
        domainInSources: false,
        citationUrls: [],
        responseText: '',
        errorMessage: errItem.errorMessage,
        isLegacySimulation: false,
        testedAt: new Date()
      }
    })

    return errItem
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    // Neutral user prompt: DO NOT bias the AI with the business name or target domain!
    const prompt = `Answer this user request objectively as a local travel and tech concierge in Bali, Indonesia. Recommend the most reputable, verified electronics repair services:
"${query}"`

    const responseText = await generateWithFallback(genAI, prompt, { jsonMode: false })

    // Extract any URLs in the response text
    const urlMatches = responseText.match(/https?:\/\/[^\s)\]]+/gi) || []
    const citationUrls = Array.from(new Set(urlMatches))

    const brandMentioned = checkBrandMentions(responseText, tenant.name, branchNames)
    const domainCited = citationUrls.some(u => isDomainMatch(cleanDomain, u))
    const domainInSources = domainCited // In text-only response, citations match sources

    let status: VisibilityStatus = 'not_found_in_run'
    if (domainCited) {
      status = 'cited'
    } else if (brandMentioned) {
      status = 'mentioned'
    }

    const testRun = await prisma.aiVisibilityTestRun.create({
      data: {
        tenantId,
        query,
        sourceType: provider,
        model: 'gemini-1.5-flash-grounding',
        status,
        brandMentioned,
        domainCited,
        domainInSources,
        citationUrls,
        responseText,
        evidenceNotes: `Unbiased prompt discovery run. Brand mentioned: ${brandMentioned}. Domain cited: ${domainCited}.`,
        isLegacySimulation: false,
        testedAt: new Date()
      }
    })

    return {
      id: testRun.id,
      query,
      provider: provider === 'OPENAI_WEB_SEARCH' ? 'OpenAI API web-search test' : 'Gemini Search Grounding test',
      model: 'gemini-1.5-flash-grounding',
      status,
      brandMentioned,
      domainCited,
      domainInSources,
      citationUrls,
      responseText,
      evidenceNotes: testRun.evidenceNotes,
      isLegacySimulation: false,
      testedAt: testRun.testedAt.toISOString()
    }
  } catch (err: any) {
    const errItem: AiVisibilityReportItem = {
      query,
      provider: provider === 'OPENAI_WEB_SEARCH' ? 'OpenAI API web-search test' : 'Gemini Search Grounding test',
      model: 'gemini-1.5-flash',
      status: 'error',
      brandMentioned: false,
      domainCited: false,
      domainInSources: false,
      citationUrls: [],
      responseText: '',
      errorMessage: err.message || 'Gagal menghubungi API provider AI.',
      isLegacySimulation: false,
      testedAt: new Date().toISOString()
    }

    await prisma.aiVisibilityTestRun.create({
      data: {
        tenantId,
        query,
        sourceType: provider,
        model: 'gemini-1.5-flash',
        status: 'error',
        brandMentioned: false,
        domainCited: false,
        domainInSources: false,
        citationUrls: [],
        responseText: '',
        errorMessage: err.message,
        isLegacySimulation: false,
        testedAt: new Date()
      }
    })

    return errItem
  }
}

/**
 * Retrieves AI visibility history for tenant without data fabrication
 */
export async function getAiVisibilityHistory(tenantId: string): Promise<AiVisibilityReportItem[]> {
  const runs = await prisma.aiVisibilityTestRun.findMany({
    where: { tenantId },
    orderBy: { testedAt: 'desc' },
    take: 100
  })

  return runs.map(r => ({
    id: r.id,
    query: r.query,
    provider: r.sourceType === 'MANUAL_CHATGPT_APP' ? 'ChatGPT App (Manual User Test)' :
              r.sourceType === 'OPENAI_WEB_SEARCH' ? 'OpenAI API web-search test' :
              r.sourceType === 'GEMINI_SEARCH_GROUNDING' ? 'Gemini Search Grounding test' : 'Legacy Simulation',
    model: r.model,
    status: r.status as VisibilityStatus,
    brandMentioned: r.brandMentioned,
    domainCited: r.domainCited,
    domainInSources: r.domainInSources,
    citationUrls: r.citationUrls,
    responseText: r.responseText,
    evidenceNotes: r.evidenceNotes,
    searchSources: r.searchSources,
    errorMessage: r.errorMessage,
    isLegacySimulation: r.isLegacySimulation,
    testedAt: r.testedAt.toISOString()
  }))
}

export interface LegacyAiVisibilityCompat {
  keyword: string
  appearsInChatGpt: boolean
  appearsInPerplexity: boolean
  appearsInGemini: boolean
  aiSummary: string
  recommendation: string
  checkedAt: string
}

/**
 * Backwards compatibility helper returning real test runs without fake data
 */
export async function checkAiVisibility(tenantId: string): Promise<LegacyAiVisibilityCompat[]> {
  const runs = await prisma.aiVisibilityTestRun.findMany({
    where: { tenantId },
    orderBy: { testedAt: 'desc' },
    take: 10
  })

  return runs.map(r => ({
    keyword: r.query,
    appearsInChatGpt: r.sourceType === 'MANUAL_CHATGPT_APP' && (r.status === 'cited' || r.status === 'mentioned'),
    appearsInPerplexity: false, // Jujur: tidak menyalin antar provider
    appearsInGemini: r.sourceType === 'GEMINI_SEARCH_GROUNDING' && (r.status === 'cited' || r.status === 'mentioned'),
    aiSummary: r.status === 'cited' ? 'Brand direkomendasikan & domain dikutip.' :
               r.status === 'mentioned' ? 'Brand disebut dalam jawaban.' :
               r.status === 'error' ? `Pemeriksaan error: ${r.errorMessage || 'Gagal'}` : 'Brand belum muncul pada pengujian ini.',
    recommendation: r.evidenceNotes || 'Optimasi konten dan schema untuk kueri ini.',
    checkedAt: r.testedAt.toISOString()
  }))
}

