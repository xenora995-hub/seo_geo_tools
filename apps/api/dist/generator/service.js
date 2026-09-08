"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAndPublish = generateAndPublish;
exports.publishExistingArticle = publishExistingArticle;
const generative_ai_1 = require("@google/generative-ai");
const prisma_1 = require("../lib/prisma");
const content_gap_ai_1 = require("./content-gap-ai");
const wordpress_1 = require("../publisher/wordpress");
const laravel_1 = require("../publisher/laravel");
const blogger_1 = require("../publisher/blogger");
const indexer_1 = require("../publisher/indexer");
const gemini_1 = require("../lib/gemini");
async function generateAndPublish(options) {
    const { tenantId, topic, keywords, publishDate } = options;
    const setting = await prisma_1.prisma.tenantSetting.findUnique({ where: { tenantId } });
    const tenant = await prisma_1.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!setting || !tenant)
        throw new Error('Setting tenant tidak ditemukan');
    if (!setting.geminiApiKey)
        throw new Error('Kunci Akses Gemini belum diatur di Pengaturan');
    const genAI = new generative_ai_1.GoogleGenerativeAI(setting.geminiApiKey);
    let targetKeywords = (keywords && keywords.length > 0) ? keywords : (setting.targetKeywords || []);
    let topicToWrite = topic;
    if (!topicToWrite) {
        try {
            console.log(`[GENERATOR] Mencari topik otomatis untuk domain: ${tenant.domain} (Niche: ${setting.businessNiche || 'Device Repair'}, Lang: ${tenant.language})...`);
            const gaps = await (0, content_gap_ai_1.generateContentGapKeywords)(genAI, tenant.domain, setting.businessNiche || undefined, 'Bali, Indonesia', tenant.language, setting.targetKeywords || []);
            if (gaps && gaps.length > 0) {
                // Ambil judul artikel sebelumnya untuk menghindari topik kembar
                const existingArticles = await prisma_1.prisma.article.findMany({
                    where: { tenantId },
                    select: { title: true },
                    orderBy: { createdAt: 'desc' },
                    take: 30
                });
                const pastTitles = existingArticles.map(a => a.title.toLowerCase());
                // Pilih topik yang belum pernah ditulis
                const unwrittenGaps = gaps.filter(g => !pastTitles.some(t => t.includes(g.keyword.toLowerCase())));
                const selectedGap = unwrittenGaps.length > 0
                    ? unwrittenGaps[Math.floor(Math.random() * unwrittenGaps.length)]
                    : gaps[Math.floor(Math.random() * gaps.length)];
                topicToWrite = selectedGap.keyword;
                // Pertahankan target keywords milik tenant bersama dengan gap keyword
                targetKeywords = [selectedGap.keyword, ...(setting.targetKeywords || []).slice(0, 4)];
                console.log(`[GENERATOR] Topik Celah Konten terpilih: ${topicToWrite}`);
            }
            else {
                console.log(`[GENERATOR] Tidak ada celah konten yang ditemukan.`);
            }
        }
        catch (err) {
            console.error(`[GENERATOR] Gagal mencari Celah Konten, fallback ke keyword default:`, err);
        }
    }
    // Fallback jika topik belum terbentuk
    if (!topicToWrite) {
        const isEn = tenant.language === 'en';
        const fallbackKw = (setting.targetKeywords && setting.targetKeywords.length > 0)
            ? setting.targetKeywords[Math.floor(Math.random() * setting.targetKeywords.length)]
            : (setting.businessNiche || 'electronics repair');
        topicToWrite = isEn
            ? `The Essential Guide to ${fallbackKw} in Bali: Expert Solutions, Timeline & Costs`
            : `Panduan Lengkap ${fallbackKw} di Bali: Solusi Cepat, Estimasi Biaya & Tips`;
    }
    // 1. Generate artikel
    console.log(`[GENERATOR] Membuat artikel dengan Gemini: ${topicToWrite}`);
    const articleData = await generateArticle(genAI, topicToWrite, targetKeywords, tenant.language, setting.customPrompt);
    // Injeksi Schema JSON-LD (Article di awal & FAQ di akhir)
    const timezone = setting.timezone || 'Asia/Makassar';
    const actualPublishDate = publishDate ? new Date(publishDate) : new Date();
    const articleSchema = generateArticleSchema(articleData.title, articleData.excerpt, articleData.suggestedKeywords, actualPublishDate, tenant.name, timezone);
    const faqSchema = generateFaqSchema(articleData.content);
    const cleanedContent = formatContentForCms(articleData.content);
    const finalContent = `${articleSchema}${cleanedContent}${faqSchema}`;
    // 2. Simpan ke DB sebagai PENDING
    const article = await prisma_1.prisma.article.create({
        data: {
            tenantId,
            title: articleData.title,
            content: finalContent,
            excerpt: articleData.excerpt,
            keywords: articleData.suggestedKeywords,
            imagePrompt: articleData.imagePrompt,
            status: 'PENDING',
        }
    });
    try {
        // 3. Generate gambar (Opsional: dinonaktifkan jika imageStyle = 'none' atau 'tanpa gambar')
        const isImageDisabled = !setting.imageStyle ||
            ['none', 'tanpa gambar', 'no image', 'disable', 'disabled', 'off'].includes(setting.imageStyle.trim().toLowerCase());
        let imageUrl = null;
        if (!isImageDisabled) {
            console.log(`[GENERATOR] Mengambil gambar gratis untuk: ${article.title}`);
            imageUrl = await generateImage(articleData.imagePrompt, setting.imageStyle);
            await prisma_1.prisma.article.update({ where: { id: article.id }, data: { imageUrl } });
        }
        else {
            console.log(`[GENERATOR] Pembuatan gambar dinonaktifkan (tanpa gambar) untuk: ${tenant.name}`);
        }
        // 4. Publish ke CMS
        let cmsPostId = null;
        let cmsPostUrl = null;
        let cmsWarning = null;
        try {
            if (tenant.cmsType === 'WORDPRESS') {
                const result = await (0, wordpress_1.publishToWordPress)({ tenant, article: { ...article, content: finalContent, imageUrl }, imageUrl, publishDate });
                cmsPostId = result.id;
                cmsPostUrl = result.url;
            }
            else if (tenant.cmsType === 'LARAVEL') {
                const result = await (0, laravel_1.publishToLaravel)({
                    tenant,
                    article: { ...article, content: finalContent, imageUrl },
                    imageUrl,
                    publishDate: actualPublishDate,
                    timezone
                });
                cmsPostId = result.id;
                cmsPostUrl = result.url;
            }
            else if (tenant.cmsType === 'BLOGGER') {
                const result = await (0, blogger_1.publishToBlogger)({ tenant, article: { ...article, content: finalContent, imageUrl }, imageUrl });
                cmsPostId = result.id;
                cmsPostUrl = result.url;
            }
            // 5. Update status menjadi PUBLISHED jika sukses
            await prisma_1.prisma.article.update({
                where: { id: article.id },
                data: { status: 'PUBLISHED', publishedAt: actualPublishDate, cmsPostId, cmsPostUrl }
            });
            console.log(`[GENERATOR] ✅ Artikel berhasil dipublikasi ke CMS: ${cmsPostUrl}`);
            // 6. Flash Indexing API (Opsional)
            if (setting.enableAutoIndex && cmsPostUrl && setting.googleServiceAccountJson) {
                try {
                    console.log(`[GENERATOR] Menembak URL ke Google Indexing API...`);
                    await (0, indexer_1.pingGoogleIndexing)(cmsPostUrl, setting.googleServiceAccountJson);
                }
                catch (idxErr) {
                    console.error(`[GENERATOR] Gagal Indexing API. Tapi artikel sudah tayang.`);
                }
            }
            return { success: true, article: { ...article, content: finalContent, cmsPostUrl, status: 'PUBLISHED' } };
        }
        catch (cmsErr) {
            console.warn(`[GENERATOR] ⚠️ Gagal publish ke CMS (${cmsErr.message}). Menyimpan artikel sebagai DRAFT.`);
            cmsWarning = `Artikel berhasil dibuat oleh AI, namun disimpan sebagai DRAFT karena gagal koneksi ke ${tenant.cmsType}: ${cmsErr.message}. Periksa URL dan Application Password di Pengaturan.`;
            await prisma_1.prisma.article.update({
                where: { id: article.id },
                data: { status: 'DRAFT', errorLog: cmsWarning }
            });
            return {
                success: true,
                article: { ...article, content: finalContent, status: 'DRAFT' },
                message: cmsWarning
            };
        }
    }
    catch (err) {
        await prisma_1.prisma.article.update({
            where: { id: article.id },
            data: { status: 'FAILED', errorLog: err.message }
        });
        console.error(`[GENERATOR] ❌ Gagal proses artikel: ${err.message}`);
        throw err;
    }
}
function generateArticleSchema(title, excerpt, keywords, publishDate, tenantName, timezone = 'Asia/Makassar') {
    let dateStr = '';
    try {
        dateStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(publishDate);
    }
    catch {
        dateStr = publishDate.toISOString().split('T')[0];
    }
    const tzOffset = timezone.includes('Jakarta') ? '+07:00' : '+08:00';
    const isoDate = `${dateStr}T08:00:00${tzOffset}`;
    const schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": excerpt,
        "keywords": keywords.join(', '),
        "datePublished": isoDate,
        "dateModified": isoDate,
        "author": {
            "@type": "Organization",
            "name": tenantName
        },
        "publisher": {
            "@type": "Organization",
            "name": tenantName
        }
    };
    return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>\n`;
}
function generateFaqSchema(contentHtml) {
    const faqItems = [];
    // Check if there is an FAQ section (e.g. <div class="faq-section"> or after FAQ header)
    let faqBlock = '';
    const faqDivMatch = contentHtml.match(/<div[^>]*class=["'][^"']*faq-section[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (faqDivMatch) {
        faqBlock = faqDivMatch[1];
    }
    else {
        const faqHeaderMatch = contentHtml.match(/<h[23][^>]*>(?:FAQ|Pertanyaan|Frequently Asked Questions)[\s\S]*$/i);
        if (faqHeaderMatch) {
            faqBlock = faqHeaderMatch[0];
        }
        else {
            faqBlock = contentHtml;
        }
    }
    // Parse FAQ items: <h3> followed by <p>
    const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
    let match;
    while ((match = h3Regex.exec(faqBlock)) !== null) {
        const question = match[1].replace(/<[^>]+>/g, '').trim();
        const answer = match[2].replace(/<[^>]+>/g, '').trim();
        if (question && answer) {
            faqItems.push({ question, answer });
        }
    }
    if (faqItems.length === 0)
        return '';
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
    };
    return `\n<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}
async function generateArticle(genAI, topic, keywords, language, customPrompt = null) {
    const isEn = language === 'en';
    const lang = isEn ? 'English' : 'Bahasa Indonesia';
    const strictContentRules = isEn ? `STRICT CONTENT INTEGRITY RULES:
- NEVER write specific statistics, percentages, or numbers unless they come from a real URL you can cite inline.
- Instead use: "many technicians report...", "common experience shows...", "most users find..."
- NEVER invent study names, research institutions, or survey results.
- If making a factual claim, add the source inline as an HTML anchor tag: <a href="[url]" rel="nofollow">[source name]</a>
- Every article MUST contain at least one real external link to a credible source (manufacturer site, official support, or known tech publication).`
        : `ATURAN INTEGRITAS KONTEN KETAT:
- JANGAN PERNAH mengarang statistik, persentase, atau angka palsu kecuali berasal dari URL nyata yang dapat dikutip langsung.
- Gunakan frasa: "banyak teknisi mencatat...", "pengalaman umum menunjukkan...", "sebagian besar pengguna menemukan..."
- JANGAN PERNAH mengarang nama riset, institusi survei, atau data penelitian fiktif.
- Jika membuat klaim faktual, sertakan sumber tautan: <a href="[url]" rel="nofollow">[nama sumber]</a>
- Setiap artikel WAJIB memiliki minimal 1 tautan eksternal ke sumber kredibel.`;
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
- Setiap bagian H2 harus mandiri dan menjawab pertanyaan secara tuntas.`;
    let prompt = '';
    if (customPrompt) {
        if (isEn) {
            prompt = `${customPrompt}
    
=== SYSTEM MANDATORY INSTRUCTIONS ===
Write a comprehensive, authoritative article about: "${topic}"
Target Language: ENGLISH ONLY
CRITICAL LANGUAGE REQUIREMENT: The entire article (Title, Excerpt, H2, H3, paragraphs, lists, and FAQs) MUST be written 100% in fluent, professional English. Do NOT include any Indonesian or foreign words unless proper nouns or local place names (e.g., Canggu, Pererenan, Bali).
Even if the topic or keywords provided contain foreign terms, translate and write strictly in English.
Target keywords: ${keywords.join(', ')}

${geoRules}

${strictContentRules}

MANDATORY OUTPUT FORMAT:
Reply ONLY with a valid JSON object, without markdown code fences, without backticks, matching this exact schema:
{
  "title": "Engaging, SEO-optimized title in English",
  "content": "Full HTML content in English with <p class='geo-summary'>, <h2>, <h3>, <ul>, and <div class='faq-section'>",
  "excerpt": "Compelling 150-character summary in English",
  "suggestedKeywords": ["keyword1", "keyword2", "keyword3"],
  "imagePrompt": "Short English image prompt describing electronic repair tools, parts, or devices on a clean workbench, product photography, no people, no faces"
}`;
        }
        else {
            prompt = `${customPrompt}
    
=== INSTRUKSI TAMBAHAN DARI SISTEM ===
Tulis artikel tentang: "${topic}"
Bahasa: Bahasa Indonesia (Wajib 100% Bahasa Indonesia)
Target keyword: ${keywords.join(', ')}

${geoRules}

${strictContentRules}

ATURAN WAJIB OUTPUT:
Balas HANYA dengan format JSON valid, tanpa markdown, tanpa backtick, menggunakan skema berikut:
{
  "title": "judul artikel yang menarik dan SEO-friendly",
  "content": "konten HTML lengkap dengan <p class=\"geo-summary\">, <h2>, <h3>, <ul>, dan <div class=\"faq-section\">",
  "excerpt": "ringkasan 150 karakter",
  "suggestedKeywords": ["keyword1", "keyword2", "keyword3"],
  "imagePrompt": "deskripsi gambar untuk di-generate, profesional, relevan dengan artikel dalam bahasa Inggris"
}`;
        }
    }
    else {
        if (isEn) {
            prompt = `You are an elite SEO & GEO (Generative Engine Optimization) expert.
Write an in-depth article about: "${topic}"
Language: English (MANDATORY: 100% fluent English. Title, body, headings, and FAQ must all be in English).
Target keywords: ${keywords.join(', ')}
Length: 1500-2500 words

${geoRules}

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
}`;
        }
        else {
            prompt = `Anda adalah pakar SEO & GEO (Generative Engine Optimization) terkemuka.
Tulis artikel mendalam tentang: "${topic}"
Bahasa: Bahasa Indonesia
Target keywords: ${keywords.join(', ')}
Panjang: 1500-2500 kata

${geoRules}

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
}`;
        }
    }
    const text = await (0, gemini_1.generateWithFallback)(genAI, prompt, { jsonMode: true });
    return parseArticleJson(text);
}
function unescapeJsonString(str) {
    if (!str)
        return '';
    return str
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\t/g, ' ')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');
}
function parseArticleJson(text) {
    // Strip any accidental markdown formatting
    let cleanText = text.trim();
    if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }
    try {
        return JSON.parse(cleanText);
    }
    catch (err) {
        const match = cleanText.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            }
            catch { }
        }
        // Robust field-by-field extraction if unescaped quotes exist in content
        const titleMatch = cleanText.match(/"title"\s*:\s*"([^"]+)"/);
        const excerptMatch = cleanText.match(/"excerpt"\s*:\s*"([^"]+)"/);
        const imagePromptMatch = cleanText.match(/"imagePrompt"\s*:\s*"([^"]+)"/);
        const keywordsMatch = cleanText.match(/"suggestedKeywords"\s*:\s*\[([\s\S]*?)\]/);
        const contentMatch = cleanText.match(/"content"\s*:\s*"([\s\S]*?)"\s*,\s*"excerpt"/);
        if (titleMatch && contentMatch) {
            let keywords = [];
            if (keywordsMatch) {
                keywords = keywordsMatch[1]
                    .split(',')
                    .map((k) => k.replace(/["'\r\n]/g, '').trim())
                    .filter(Boolean);
            }
            return {
                title: unescapeJsonString(titleMatch[1]),
                content: unescapeJsonString(contentMatch[1]),
                excerpt: excerptMatch ? unescapeJsonString(excerptMatch[1]) : unescapeJsonString(titleMatch[1]),
                suggestedKeywords: keywords.length > 0 ? keywords : ['service iphone bali'],
                imagePrompt: imagePromptMatch ? unescapeJsonString(imagePromptMatch[1]) : unescapeJsonString(titleMatch[1]),
            };
        }
        throw new Error(`Gagal parse JSON artikel: ${err.message}`);
    }
}
async function generateImage(prompt, style) {
    // Gunakan Pollinations AI (100% Gratis, tanpa API Key)
    const fullPrompt = `${prompt}. Style: ${style}. Product photography, clean background, photorealistic, 8k resolution, highly detailed, no people, no humans, no faces, no hands, professional lighting.`;
    const encodedPrompt = encodeURIComponent(fullPrompt);
    // Menambahkan seed acak agar gambar tidak tercache jika prompt persis sama
    const randomSeed = Math.floor(Math.random() * 1000000);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${randomSeed}&model=flux`;
}
function formatContentForCms(html) {
    // 0. Clean literal JSON escape sequences (e.g. \n, \", \\') so they never appear on the website
    let cleaned = html
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\t/g, ' ')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');
    // 1. Convert <table> to clean semantic list to prevent CMS HTML parser crashes
    cleaned = cleaned.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => {
        const rows = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
        if (rows.length <= 1)
            return '';
        let listHtml = '<ul>';
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
            const rowData = cells.map(c => c.replace(/<[^>]+>/g, '').trim());
            if (rowData.length > 0) {
                listHtml += `<li><strong>${rowData[0]}</strong>: ${rowData.slice(1).join(' — ')}</li>`;
            }
        }
        listHtml += '</ul>';
        return listHtml;
    });
    // 2. Remove wrapper <div> tags which some CMS sanitizers reject
    cleaned = cleaned
        .replace(/<div\s+class=["'][^"']*faq-section[^"']*["']\s*>/gi, '')
        .replace(/<\/?div[^>]*>/gi, '');
    return cleaned;
}
async function publishExistingArticle(articleId) {
    const article = await prisma_1.prisma.article.findUnique({
        where: { id: articleId },
        include: { tenant: { include: { setting: true } } }
    });
    if (!article)
        throw new Error('Artikel tidak ditemukan');
    const { tenant } = article;
    if (!tenant.cmsUrl || !tenant.cmsApiKey) {
        throw new Error('Pengaturan CMS (URL atau API Key) belum diatur di Pengaturan');
    }
    let cmsPostId = null;
    let cmsPostUrl = null;
    const cleanContent = formatContentForCms(article.content);
    if (tenant.cmsType === 'WORDPRESS') {
        const result = await (0, wordpress_1.publishToWordPress)({
            tenant: { cmsUrl: tenant.cmsUrl, cmsApiKey: tenant.cmsApiKey },
            article: {
                title: article.title,
                content: cleanContent,
                excerpt: article.excerpt || '',
                keywords: article.keywords,
                imageUrl: article.imageUrl
            }
        });
        cmsPostId = result.id;
        cmsPostUrl = result.url;
    }
    else if (tenant.cmsType === 'LARAVEL') {
        const result = await (0, laravel_1.publishToLaravel)({
            tenant: { cmsUrl: tenant.cmsUrl, cmsApiKey: tenant.cmsApiKey },
            article: {
                title: article.title,
                content: cleanContent,
                excerpt: article.excerpt || '',
                keywords: article.keywords,
                imageUrl: article.imageUrl
            },
            publishDate: article.createdAt,
            timezone: tenant.setting?.timezone || 'Asia/Makassar'
        });
        cmsPostId = result.id;
        cmsPostUrl = result.url;
    }
    else if (tenant.cmsType === 'BLOGGER') {
        const result = await (0, blogger_1.publishToBlogger)({
            tenant: tenant,
            article: article
        });
        cmsPostId = result.id;
        cmsPostUrl = result.url;
    }
    else {
        throw new Error(`Tipe CMS ${tenant.cmsType} belum didukung`);
    }
    const updated = await prisma_1.prisma.article.update({
        where: { id: article.id },
        data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            cmsPostId,
            cmsPostUrl,
            errorLog: null
        }
    });
    if (tenant.setting?.enableAutoIndex && cmsPostUrl && tenant.setting?.googleServiceAccountJson) {
        try {
            console.log(`[GENERATOR] Menembak URL ke Google Indexing API...`);
            await (0, indexer_1.pingGoogleIndexing)(cmsPostUrl, tenant.setting.googleServiceAccountJson);
        }
        catch (idxErr) {
            console.error(`[GENERATOR] Gagal Indexing API:`, idxErr);
        }
    }
    return updated;
}
//# sourceMappingURL=service.js.map