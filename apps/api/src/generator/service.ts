import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '../lib/prisma'
import { generateContentGapKeywords } from './content-gap-ai'
import { publishToWordPress } from '../publisher/wordpress'
import { publishToLaravel } from '../publisher/laravel'
import { publishToBlogger } from '../publisher/blogger'
import { pingGoogleIndexing } from '../publisher/indexer'
import { generateWithFallback } from '../lib/gemini'

interface GenerateOptions {
  tenantId: string
  topic?: string
  keywords?: string[]
  publishDate?: string // Tambahan untuk backdate
}

export async function generateAndPublish(options: GenerateOptions) {
  const { tenantId, topic, keywords, publishDate } = options

  const setting = await prisma.tenantSetting.findUnique({ where: { tenantId } })
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })

  if (!setting || !tenant) throw new Error('Setting tenant tidak ditemukan')
  if (!setting.geminiApiKey) throw new Error('Kunci Akses Gemini belum diatur di Pengaturan')

  const genAI = new GoogleGenerativeAI(setting.geminiApiKey)

  let targetKeywords = (keywords && keywords.length > 0) ? keywords : (setting.targetKeywords || [])
  let topicToWrite = topic

  if (!topicToWrite) {
    try {
      console.log(`[GENERATOR] Mencari topik otomatis untuk domain: ${tenant.domain} (Niche: ${setting.businessNiche || 'Device Repair'}, Lang: ${tenant.language})...`)
      const gaps = await generateContentGapKeywords(
        genAI,
        tenant.domain,
        setting.businessNiche || undefined,
        'Bali, Indonesia',
        tenant.language,
        setting.targetKeywords || []
      )

      if (gaps && gaps.length > 0) {
        // Ambil judul artikel sebelumnya untuk menghindari topik kembar
        const existingArticles = await prisma.article.findMany({
          where: { tenantId },
          select: { title: true },
          orderBy: { createdAt: 'desc' },
          take: 30
        })
        const pastTitles = existingArticles.map(a => a.title.toLowerCase())

        // Pilih topik yang belum pernah ditulis
        const unwrittenGaps = gaps.filter(g => !pastTitles.some(t => t.includes(g.keyword.toLowerCase())))
        const selectedGap = unwrittenGaps.length > 0
          ? unwrittenGaps[Math.floor(Math.random() * unwrittenGaps.length)]
          : gaps[Math.floor(Math.random() * gaps.length)]

        topicToWrite = selectedGap.keyword
        // Pertahankan target keywords milik tenant bersama dengan gap keyword
        targetKeywords = [selectedGap.keyword, ...(setting.targetKeywords || []).slice(0, 4)]
        console.log(`[GENERATOR] Topik Celah Konten terpilih: ${topicToWrite}`)
      } else {
        console.log(`[GENERATOR] Tidak ada celah konten yang ditemukan.`)
      }
    } catch (err) {
      console.error(`[GENERATOR] Gagal mencari Celah Konten, fallback ke keyword default:`, err)
    }
  }

  // Fallback jika topik belum terbentuk
  if (!topicToWrite) {
    const isEn = tenant.language === 'en'
    const fallbackKw = (setting.targetKeywords && setting.targetKeywords.length > 0)
      ? setting.targetKeywords[Math.floor(Math.random() * setting.targetKeywords.length)]
      : (setting.businessNiche || 'electronics repair')

    topicToWrite = isEn
      ? `The Essential Guide to ${fallbackKw} in Bali: Expert Solutions, Timeline & Costs`
      : `Panduan Lengkap ${fallbackKw} di Bali: Solusi Cepat, Estimasi Biaya & Tips`
  }

  // 1. Generate artikel
  console.log(`[GENERATOR] Membuat artikel dengan Gemini: ${topicToWrite}`)
  const articleData = await generateArticle(genAI, topicToWrite, targetKeywords, tenant.language, setting.customPrompt)

  // Injeksi 3 Schema JSON-LD (Article, LocalBusiness, dan FAQ)
  const timezone = setting.timezone || 'Asia/Makassar'
  const actualPublishDate = publishDate ? new Date(publishDate) : new Date()
  const authorName = getDynamicAuthor(`${topicToWrite || ''} ${articleData.title}`)
  const articleUrl = getArticleUrl(articleData.title, tenant.cmsUrl)

  const articleSchema = generateArticleSchema(
    articleData.title,
    articleData.excerpt,
    articleData.suggestedKeywords,
    actualPublishDate,
    authorName,
    articleUrl,
    timezone
  )
  const localBusinessSchema = generateLocalBusinessSchema()
  const faqSchema = generateFaqSchema(articleData.content)
  const cleanedContent = formatContentForCms(articleData.content)
  const finalContent = `${articleSchema}${localBusinessSchema}${cleanedContent}${faqSchema ? `\n${faqSchema}` : ''}`

  // 2. Simpan ke DB sebagai PENDING
  const article = await prisma.article.create({
    data: {
      tenantId,
      title: articleData.title,
      content: finalContent,
      excerpt: articleData.excerpt,
      keywords: articleData.suggestedKeywords,
      imagePrompt: articleData.imagePrompt,
      status: 'PENDING',
    }
  })

  try {
    // 3. Mode Full Artikel Teks Murni (Tanpa Gambar)
    // Sesuai preferensi, seluruh artikel dibuat murni teks/full artikel tanpa gambar banner / featured media
    const imageUrl: string | null = null
    console.log(`[GENERATOR] Mode Full Artikel Murni (tanpa gambar) untuk: ${tenant.name} | Author: ${authorName}`)

    // 4. Publish ke CMS (Murni Teks, imageUrl = null)
    let cmsPostId: string | null = null
    let cmsPostUrl: string | null = null
    let cmsWarning: string | null = null

    try {
      if (tenant.cmsType === 'WORDPRESS') {
        const result = await publishToWordPress({ 
          tenant, 
          article: { ...article, content: finalContent, imageUrl: null, author: authorName }, 
          imageUrl: null, 
          publishDate: actualPublishDate.toISOString() 
        })
        cmsPostId = result.id
        cmsPostUrl = result.url
      } else if (tenant.cmsType === 'LARAVEL') {
        const result = await publishToLaravel({
          tenant,
          article: { ...article, content: finalContent, imageUrl: null, author: authorName },
          imageUrl: null,
          publishDate: actualPublishDate,
          timezone
        })
        cmsPostId = result.id
        cmsPostUrl = result.url
      } else if (tenant.cmsType === 'BLOGGER') {
        const result = await publishToBlogger({ tenant, article: { ...article, content: finalContent, imageUrl: null }, imageUrl: null })
        cmsPostId = result.id
        cmsPostUrl = result.url
      }

      // 5. Update status menjadi PUBLISHED jika sukses
      await prisma.article.update({
        where: { id: article.id },
        data: { status: 'PUBLISHED', publishedAt: actualPublishDate, cmsPostId, cmsPostUrl }
      })

      console.log(`[GENERATOR] ✅ Artikel berhasil dipublikasi ke CMS: ${cmsPostUrl}`)

      // 6. Flash Indexing API (Opsional)
      if (setting.enableAutoIndex && cmsPostUrl && setting.googleServiceAccountJson) {
        try {
          console.log(`[GENERATOR] Menembak URL ke Google Indexing API...`)
          await pingGoogleIndexing(cmsPostUrl, setting.googleServiceAccountJson)
        } catch (idxErr) {
          console.error(`[GENERATOR] Gagal Indexing API. Tapi artikel sudah tayang.`)
        }
      }

      return { success: true, article: { ...article, content: finalContent, cmsPostUrl, status: 'PUBLISHED' } }

    } catch (cmsErr: any) {
      console.warn(`[GENERATOR] ⚠️ Gagal publish ke CMS (${cmsErr.message}). Menyimpan artikel sebagai DRAFT.`)
      cmsWarning = `Artikel berhasil dibuat oleh AI, namun disimpan sebagai DRAFT karena gagal koneksi ke ${tenant.cmsType}: ${cmsErr.message}. Periksa URL dan Application Password di Pengaturan.`
      
      await prisma.article.update({
        where: { id: article.id },
        data: { status: 'DRAFT', errorLog: cmsWarning }
      })

      return {
        success: true,
        article: { ...article, content: finalContent, status: 'DRAFT' },
        message: cmsWarning
      }
    }

  } catch (err: any) {
    await prisma.article.update({
      where: { id: article.id },
      data: { status: 'FAILED', errorLog: err.message }
    })
    console.error(`[GENERATOR] ❌ Gagal proses artikel: ${err.message}`)
    throw err
  }
}

export function getDynamicAuthor(topicOrTitle: string): string {
  const text = (topicOrTitle || '').toLowerCase()

  // 1. Water Damage
  if (
    text.includes('water damage') ||
    text.includes('water-damage') ||
    text.includes('liquid damage') ||
    text.includes('kemasukan air') ||
    text.includes('terkena air') ||
    text.includes('kena air') ||
    text.includes('water recovery')
  ) {
    return 'Device Recovery Specialist, Bali Phone Repair Team'
  }

  // 2. iPhone / iPad
  if (
    text.includes('iphone') ||
    text.includes('ipad') ||
    text.includes('apple watch') ||
    text.includes('ios')
  ) {
    return 'iPhone Repair Specialist, Bali Phone Repair Team'
  }

  // 3. MacBook / Laptop
  if (
    text.includes('macbook') ||
    text.includes('laptop') ||
    text.includes('mac mini') ||
    text.includes('imac') ||
    text.includes('notebook')
  ) {
    return 'MacBook Technician, Bali Phone Repair Team'
  }

  // 4. Android
  if (
    text.includes('android') ||
    text.includes('samsung') ||
    text.includes('xiaomi') ||
    text.includes('oppo') ||
    text.includes('vivo') ||
    text.includes('pixel') ||
    text.includes('redmi') ||
    text.includes('realme') ||
    text.includes('huawei')
  ) {
    return 'Android Repair Expert, Bali Phone Repair Team'
  }

  // 5. Default
  return 'Bali Phone Repair Team'
}

export function getArticleUrl(title: string, tenantCmsUrl?: string, cmsPostUrl?: string | null): string {
  if (cmsPostUrl) return cmsPostUrl
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const base = (tenantCmsUrl || 'https://baliphonerepair.com').replace(/\/$/, '')
  return `${base}/posts/${slug}`
}

export function generateArticleSchema(
  title: string,
  excerpt: string,
  keywords: string[],
  publishDate: Date,
  authorName: string,
  articleUrl: string,
  timezone: string = 'Asia/Makassar'
): string {
  let dateStr = ''
  try {
    dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(publishDate)
  } catch {
    dateStr = publishDate.toISOString().split('T')[0]
  }

  const tzOffset = timezone.includes('Jakarta') ? '+07:00' : '+08:00'
  const isoDate = `${dateStr}T08:00:00${tzOffset}`

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": excerpt,
    "keywords": keywords.join(', '),
    "url": articleUrl,
    "datePublished": isoDate,
    "dateModified": isoDate,
    "author": {
      "@type": "Person",
      "name": authorName,
      "worksFor": {
        "@type": "Organization",
        "name": "Bali Phone Repair"
      }
    },
    "publisher": {
      "@type": "Organization",
      "name": "Bali Phone Repair",
      "logo": {
        "@type": "ImageObject",
        "url": "https://baliphonerepair.com/assets/bali-phone-repair/logo-optimized.jpg"
      }
    }
  }
  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>\n`
}

export function generateFaqSchema(contentHtml: string): string {
  const faqItems: Array<{ question: string; answer: string }> = []

  // Deteksi H3 yang diakhiri tanda tanya (?) sebagai pertanyaan, dan paragraf setelahnya sebagai jawaban
  const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi
  let match: RegExpExecArray | null
  while ((match = h3Regex.exec(contentHtml)) !== null) {
    const rawQuestion = match[1].replace(/<[^>]+>/g, '').trim()
    const rawAnswer = match[2].replace(/<[^>]+>/g, '').trim()
    if (rawQuestion && rawQuestion.endsWith('?') && rawAnswer) {
      faqItems.push({ question: rawQuestion, answer: rawAnswer })
    }
  }

  if (faqItems.length === 0) return ''

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  }

  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>\n`
}

export function generateLocalBusinessSchema(): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Bali Phone Repair",
    "url": "https://baliphonerepair.com",
    "telephone": "+6281929164999",
    "email": "hello@baliphonerepair.com",
    "image": "https://baliphonerepair.com/assets/bali-phone-repair/logo-optimized.jpg",
    "description": "Professional smartphone, tablet, and laptop repair services in Bali including iPhone, MacBook, and Android device recovery with certified technicians and genuine warranty.",
    "areaServed": [
      "Canggu",
      "Seminyak",
      "Kuta",
      "Uluwatu",
      "Denpasar",
      "Sanur",
      "Ubud",
      "Jimbaran",
      "Nusa Dua"
    ],
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Jl. Pulau Misol No.106, Dauh Puri Kauh",
      "addressLocality": "Denpasar",
      "addressRegion": "Bali",
      "postalCode": "80113",
      "addressCountry": "ID"
    },
    "openingHours": [
      "Mo-Sa 09:00-21:00",
      "Su 09:00-18:00"
    ]
  }

  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>\n`
}

async function generateArticle(genAI: GoogleGenerativeAI, topic: string, keywords: string[], language: string, customPrompt: string | null = null) {
  const isEn = language === 'en'
  const lang = isEn ? 'English' : 'Bahasa Indonesia'

  const strictContentRules = isEn ? `STRICT CONTENT INTEGRITY RULES:
- NEVER write specific statistics, percentages, or numbers unless they come from a real URL you can cite inline.
- Instead use: "many technicians report...", "common experience shows...", "most users find..."
- NEVER invent study names, research institutions, or survey results.
- If making a factual claim, add the source inline as an HTML anchor tag: <a href="[url]" rel="nofollow">[source name]</a>
- Every article MUST contain at least one real external link to a credible source (manufacturer site, official support, or known tech publication).
- DO NOT insert any <img> tags, image markdown, or picture placeholders. The article must be 100% full text only.`
  : `ATURAN INTEGRITAS KONTEN KETAT:
- JANGAN PERNAH mengarang statistik, persentase, atau angka palsu kecuali berasal dari URL nyata yang dapat dikutip langsung.
- Gunakan frasa: "banyak teknisi mencatat...", "pengalaman umum menunjukkan...", "sebagian besar pengguna menemukan..."
- JANGAN PERNAH mengarang nama riset, institusi survei, atau data penelitian fiktif.
- Jika membuat klaim faktual, sertakan sumber tautan: <a href="[url]" rel="nofollow">[nama sumber]</a>
- Setiap artikel WAJIB memiliki minimal 1 tautan eksternal ke sumber kredibel.
- DILARANG menyertakan tag <img>, URL gambar, atau placeholder gambar apapun. Artikel harus 100% full teks/tulisan lengkap.`

  const geoRules = isEn ? `GEO OPTIMIZATION RULES (for Generative AI Search & Citations):
- Start the article immediately with a 2-3 sentence "direct answer" paragraph that summarizes the entire solution. Label it with: <p class="geo-summary"><strong>Quick Answer:</strong> [summary]</p>
- Use explicit definition format for key terms: "[Term] is defined as..."
- Include a "Key Takeaways" section before the FAQ using <ul> with 3-5 bullet points.
- Write in direct second person where appropriate ("you should...", "your device...")
- Avoid vague openers like "In today's world..." or "Many people wonder..."
- Each H2 section must be self-contained and answerable as a standalone answer.`
  : `ATURAN OPTIMASI GEO (Generative Engine Optimization):
- Mulai artikel dengan 2-3 kalimat ringkasan langsung dengan tag: <p class="geo-summary"><strong>Quick Answer:</strong> [ringkasan solusi]</p>
- Gunakan format definisi eksplisit untuk istilah penting: "[Istilah] adalah..."
- Sertakan bagian "Poin Penting" sebelum FAQ menggunakan <ul> dengan 3-5 butir ringkasan.
- Tulis dengan gaya percakapan langsung ("Anda harus...", "perangkat Anda...")
- Setiap bagian H2 harus mandiri dan menjawab pertanyaan secara tuntas.`

  const humanTouchRules = isEn ? `HUMAN TOUCH & REAL TECHNICIAN EXPERIENCE (E-E-A-T REQUIREMENT):
At the beginning of the article, add one short paragraph (2-3 sentences) that sounds like a real technician speaking from experience. Use phrases like 'In our experience handling hundreds of devices in Bali...', 'Our technicians in Canggu frequently see this issue...', or 'After fixing this problem for tourists and expats across Bali...'. This paragraph must feel authentic and human, not generic.`
  : `SENTUHAN MANUSIA & PENGALAMAN NYATA TEKNISI (KRUSIAL UNTUK E-E-A-T):
Di bagian awal artikel, tambahkan satu paragraf pendek (2-3 kalimat) yang terdengar seperti teknisi asli yang berbicara dari pengalaman lapangan. Gunakan frasa seperti 'Berdasarkan pengalaman kami menangani ratusan perangkat di Bali...', 'Teknisi kami di Canggu sering menemui masalah ini...', atau 'Setelah memperbaiki masalah serupa untuk para turis dan ekspatriat di seluruh Bali...'. Paragraf ini harus terasa otentik dan manusiawi, bukan tulisan generik AI.`

  const internalLinkingRules = isEn ? `INTERNAL LINKING REQUIREMENT:
At the end of the article body, before the FAQ section, add a natural paragraph that internally links to at least 2 relevant service pages using contextual anchor text.
Example: If you need immediate help, our iPhone repair Canggu team at https://baliphonerepair.com/services/iphone-repair-bali is available same-day, or you can book a MacBook repair Bali session at https://baliphonerepair.com/services/macbook-repair-bali directly from our service page.
Available service links you can use:
- iPhone Repair: https://baliphonerepair.com/services/iphone-repair-bali
- MacBook Repair: https://baliphonerepair.com/services/macbook-repair-bali
- iPad Repair: https://baliphonerepair.com/services/ipad-repair-bali
- Water Damage Repair: https://baliphonerepair.com/services/water-damage-repair-bali
- Android Repair: https://baliphonerepair.com/services/android-repair-bali
- Screen Replacement: https://baliphonerepair.com/services/screen-replacement-bali
- Battery Replacement: https://baliphonerepair.com/services/battery-replacement-bali`
  : `INSTRUKSI INTERNAL LINKING OTOMATIS:
Di bagian akhir isi artikel, sebelum bagian FAQ, tambahkan satu paragraf natural yang menautkan (internal link) ke minimal 2 halaman layanan yang relevan menggunakan anchor text kontekstual.
Contoh: Jika Anda memerlukan bantuan segera, tim servis iPhone Canggu kami di https://baliphonerepair.com/services/iphone-repair-bali siap melayani di hari yang sama, atau Anda dapat memesan sesi perbaikan MacBook Bali di https://baliphonerepair.com/services/macbook-repair-bali langsung dari halaman layanan kami.
Tautan layanan yang dapat digunakan:
- Servis iPhone: https://baliphonerepair.com/services/iphone-repair-bali
- Servis MacBook: https://baliphonerepair.com/services/macbook-repair-bali
- Servis iPad: https://baliphonerepair.com/services/ipad-repair-bali
- Servis Water Damage: https://baliphonerepair.com/services/water-damage-repair-bali
- Servis Android: https://baliphonerepair.com/services/android-repair-bali
- Ganti Layar / LCD: https://baliphonerepair.com/services/screen-replacement-bali
- Ganti Baterai: https://baliphonerepair.com/services/battery-replacement-bali`

  let prompt = ''
  if (customPrompt) {
    if (isEn) {
      prompt = `${customPrompt}
    
=== SYSTEM MANDATORY INSTRUCTIONS ===
Write a comprehensive, authoritative article about: "${topic}"
Target Language: ENGLISH ONLY
CRITICAL LANGUAGE REQUIREMENT: The entire article (Title, Excerpt, H2, H3, paragraphs, lists, and FAQs) MUST be written 100% in fluent, professional English. Do NOT include any Indonesian or foreign words unless proper nouns or local place names (e.g., Canggu, Pererenan, Bali).
Even if the topic or keywords provided contain foreign terms, translate and write strictly in English.
Target keywords: ${keywords.join(', ')}

${humanTouchRules}

${geoRules}

${internalLinkingRules}

${strictContentRules}

MANDATORY OUTPUT FORMAT:
Reply ONLY with a valid JSON object, without markdown code fences, without backticks, matching this exact schema:
{
  "title": "Engaging, SEO-optimized title in English",
  "content": "Full HTML content in English with <p class='geo-summary'>, <h2>, <h3>, <ul>, and <div class='faq-section'>",
  "excerpt": "Compelling 150-character summary in English",
  "suggestedKeywords": ["keyword1", "keyword2", "keyword3"],
  "imagePrompt": "Short English image prompt describing electronic repair tools, parts, or devices on a clean workbench, product photography, no people, no faces"
}`
    } else {
      prompt = `${customPrompt}
    
=== INSTRUKSI TAMBAHAN DARI SISTEM ===
Tulis artikel tentang: "${topic}"
Bahasa: Bahasa Indonesia (Wajib 100% Bahasa Indonesia)
Target keyword: ${keywords.join(', ')}

${humanTouchRules}

${geoRules}

${internalLinkingRules}

${strictContentRules}

ATURAN WAJIB OUTPUT:
Balas HANYA dengan format JSON valid, tanpa markdown, tanpa backtick, menggunakan skema berikut:
{
  "title": "judul artikel yang menarik dan SEO-friendly",
  "content": "konten HTML lengkap dengan <p class=\"geo-summary\">, <h2>, <h3>, <ul>, dan <div class=\"faq-section\">",
  "excerpt": "ringkasan 150 karakter",
  "suggestedKeywords": ["keyword1", "keyword2", "keyword3"],
  "imagePrompt": "deskripsi gambar untuk di-generate, profesional, relevan dengan artikel dalam bahasa Inggris"
}`
    }
  } else {
    if (isEn) {
      prompt = `You are an elite SEO & GEO (Generative Engine Optimization) expert and master electronics repair technician in Bali.
Write an in-depth article about: "${topic}"
Language: English (MANDATORY: 100% fluent English. Title, body, headings, and FAQ must all be in English).
Target keywords: ${keywords.join(', ')}
Length: 1500-2500 words

${humanTouchRules}

${geoRules}

${internalLinkingRules}

${strictContentRules}

OUTPUT RULES:
- Use single quotes for HTML attributes (example: <p class='geo-summary'>, <div class='faq-section'>).
- Reply ONLY with a valid JSON object:
{
  "title": "SEO-friendly title in English",
  "content": "Full HTML content in English with <p class='geo-summary'>, <h2>, <h3>, <ul>, and <div class='faq-section'>",
  "excerpt": "150-character summary in English",
  "suggestedKeywords": ["kw1", "kw2"],
  "imagePrompt": "Short English image prompt of repair tools, devices, product photography, no humans, no faces"
}`
    } else {
      prompt = `Anda adalah pakar SEO & GEO (Generative Engine Optimization) terkemuka dan teknisi servis elektronik profesional di Bali.
Tulis artikel mendalam tentang: "${topic}"
Bahasa: Bahasa Indonesia
Target keywords: ${keywords.join(', ')}
Panjang: 1500-2500 kata

${humanTouchRules}

${geoRules}

${internalLinkingRules}

${strictContentRules}

ATURAN OUTPUT:
- Gunakan petik tunggal untuk atribut HTML (contoh: <p class='geo-summary'>, <div class='faq-section'>).
- Balas HANYA dengan objek JSON valid:
{
  "title": "Judul SEO-friendly",
  "content": "Konten HTML lengkap dengan <p class='geo-summary'>, <h2>, <h3>, <ul>, dan <div class='faq-section'>",
  "excerpt": "Ringkasan 150 karakter",
  "suggestedKeywords": ["kw1", "kw2"],
  "imagePrompt": "Prompt gambar singkat dalam bahasa Inggris tanpa manusia/wajah"
}`
    }
  }

  const text = await generateWithFallback(genAI, prompt, { jsonMode: true })
  return parseArticleJson(text)
}

function unescapeJsonString(str: string): string {
  if (!str) return ''
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')
}

function parseArticleJson(text: string): any {
  // Strip any accidental markdown formatting
  let cleanText = text.trim()
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  }

  try {
    return JSON.parse(cleanText)
  } catch (err: any) {
    const match = cleanText.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {}
    }

    // Robust field-by-field extraction if unescaped quotes exist in content
    const titleMatch = cleanText.match(/"title"\s*:\s*"([^"]+)"/)
    const excerptMatch = cleanText.match(/"excerpt"\s*:\s*"([^"]+)"/)
    const imagePromptMatch = cleanText.match(/"imagePrompt"\s*:\s*"([^"]+)"/)
    const keywordsMatch = cleanText.match(/"suggestedKeywords"\s*:\s*\[([\s\S]*?)\]/)
    const contentMatch = cleanText.match(/"content"\s*:\s*"([\s\S]*?)"\s*,\s*"excerpt"/)

    if (titleMatch && contentMatch) {
      let keywords: string[] = []
      if (keywordsMatch) {
        keywords = keywordsMatch[1]
          .split(',')
          .map((k: string) => k.replace(/["'\r\n]/g, '').trim())
          .filter(Boolean)
      }
      return {
        title: unescapeJsonString(titleMatch[1]),
        content: unescapeJsonString(contentMatch[1]),
        excerpt: excerptMatch ? unescapeJsonString(excerptMatch[1]) : unescapeJsonString(titleMatch[1]),
        suggestedKeywords: keywords.length > 0 ? keywords : ['service iphone bali'],
        imagePrompt: imagePromptMatch ? unescapeJsonString(imagePromptMatch[1]) : unescapeJsonString(titleMatch[1]),
      }
    }

    throw new Error(`Gagal parse JSON artikel: ${err.message}`)
  }
}

async function generateImage(prompt: string, style: string): Promise<string> {
  // Gunakan Pollinations AI (100% Gratis, tanpa API Key)
  const fullPrompt = `${prompt}. Style: ${style}. Product photography, clean background, photorealistic, 8k resolution, highly detailed, no people, no humans, no faces, no hands, professional lighting.`
  const encodedPrompt = encodeURIComponent(fullPrompt)
  // Menambahkan seed acak agar gambar tidak tercache jika prompt persis sama
  const randomSeed = Math.floor(Math.random() * 1000000)
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${randomSeed}&model=flux`
}

function formatContentForCms(html: string): string {
  // 0. Clean literal JSON escape sequences (e.g. \n, \", \\') so they never appear on the website
  let cleaned = html
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')

  // 1. Remove any <img> and <figure> tags to ensure 100% full-text articles without pictures
  cleaned = cleaned
    .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
    .replace(/<img[^>]*>/gi, '')

  // 2. Convert <table> to clean semantic list to prevent CMS HTML parser crashes
  cleaned = cleaned.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => {
    const rows = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || []
    if (rows.length <= 1) return ''
    let listHtml = '<ul>'
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []
      const rowData = cells.map(c => c.replace(/<[^>]+>/g, '').trim())
      if (rowData.length > 0) {
        listHtml += `<li><strong>${rowData[0]}</strong>: ${rowData.slice(1).join(' — ')}</li>`
      }
    }
    listHtml += '</ul>'
    return listHtml
  })

  // 3. Remove wrapper <div> tags which some CMS sanitizers reject
  cleaned = cleaned
    .replace(/<div\s+class=["'][^"']*faq-section[^"']*["']\s*>/gi, '')
    .replace(/<\/?div[^>]*>/gi, '')

  return cleaned
}

export async function publishExistingArticle(articleId: string, customPublishDate?: string | Date | null) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { tenant: { include: { setting: true } } }
  })
  if (!article) throw new Error('Artikel tidak ditemukan')
  const { tenant } = article
  if (!tenant.cmsUrl || !tenant.cmsApiKey) {
    throw new Error('Pengaturan CMS (URL atau API Key) belum diatur di Pengaturan')
  }

  const timezone = tenant.setting?.timezone || 'Asia/Makassar'
  const actualPublishDate = customPublishDate ? new Date(customPublishDate) : new Date()
  const authorName = getDynamicAuthor(article.title)
  const articleUrl = getArticleUrl(article.title, tenant.cmsUrl, article.cmsPostUrl)

  // Bersihkan schema JSON-LD lama jika ada sebelum membuat ulang 3 schema baru
  const rawBody = article.content.replace(/<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>\s*/gi, '')
  const cleanContent = formatContentForCms(rawBody)

  const newArticleSchema = generateArticleSchema(
    article.title,
    article.excerpt || '',
    article.keywords,
    actualPublishDate,
    authorName,
    articleUrl,
    timezone
  )
  const newLocalBusinessSchema = generateLocalBusinessSchema()
  const newFaqSchema = generateFaqSchema(cleanContent)
  const updatedContent = `${newArticleSchema}${newLocalBusinessSchema}${cleanContent}${newFaqSchema ? `\n${newFaqSchema}` : ''}`

  let cmsPostId: string | null = null
  let cmsPostUrl: string | null = null

  if (tenant.cmsType === 'WORDPRESS') {
    const result = await publishToWordPress({
      tenant: { cmsUrl: tenant.cmsUrl, cmsApiKey: tenant.cmsApiKey },
      article: {
        title: article.title,
        content: updatedContent,
        excerpt: article.excerpt || '',
        keywords: article.keywords,
        author: authorName,
        imageUrl: null
      },
      imageUrl: null,
      publishDate: actualPublishDate.toISOString()
    })
    cmsPostId = result.id
    cmsPostUrl = result.url
  } else if (tenant.cmsType === 'LARAVEL') {
    const result = await publishToLaravel({
      tenant: { cmsUrl: tenant.cmsUrl, cmsApiKey: tenant.cmsApiKey },
      article: {
        title: article.title,
        content: updatedContent,
        excerpt: article.excerpt || '',
        keywords: article.keywords,
        author: authorName,
        imageUrl: null
      },
      imageUrl: null,
      publishDate: actualPublishDate,
      timezone
    })
    cmsPostId = result.id
    cmsPostUrl = result.url
  } else if (tenant.cmsType === 'BLOGGER') {
    const result = await publishToBlogger({
      tenant: tenant as any,
      article: { ...article, content: updatedContent, author: authorName } as any,
      imageUrl: null
    })
    cmsPostId = result.id
    cmsPostUrl = result.url
  } else {
    throw new Error(`Tipe CMS ${tenant.cmsType} belum didukung`)
  }

  const updated = await prisma.article.update({
    where: { id: article.id },
    data: {
      content: updatedContent,
      status: 'PUBLISHED',
      publishedAt: actualPublishDate,
      cmsPostId,
      cmsPostUrl,
      errorLog: null
    }
  })

  if (tenant.setting?.enableAutoIndex && cmsPostUrl && tenant.setting?.googleServiceAccountJson) {
    try {
      console.log(`[GENERATOR] Menembak URL ke Google Indexing API...`)
      await pingGoogleIndexing(cmsPostUrl, tenant.setting.googleServiceAccountJson)
    } catch (idxErr) {
      console.error(`[GENERATOR] Gagal Indexing API:`, idxErr)
    }
  }

  return updated
}

