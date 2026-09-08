"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scraperRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const generative_ai_1 = require("@google/generative-ai");
const axios_1 = __importDefault(require("axios"));
const gemini_1 = require("../lib/gemini");
exports.scraperRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
exports.scraperRouter.post('/analyze-domain', async (req, res) => {
    try {
        const { tenantId, domain } = req.body;
        if (!tenantId || !domain) {
            return res.status(400).json({ success: false, error: 'tenantId dan domain diperlukan' });
        }
        // Ambil API Key dari pengaturan tenant
        const setting = await prisma.tenantSetting.findUnique({
            where: { tenantId },
            include: { tenant: true }
        });
        if (!setting || !setting.geminiApiKey) {
            return res.status(400).json({ success: false, error: 'Kunci API Gemini belum diatur di menu Pengaturan.' });
        }
        // Pastikan URL memiliki http:// atau https://
        let targetUrl = domain;
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = `https://${domain}`;
        }
        // Lakukan HTTP Request ke website klien
        let htmlContent = '';
        try {
            const response = await axios_1.default.get(targetUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            htmlContent = response.data;
        }
        catch (e) {
            // Jika HTTPS gagal, coba HTTP biasa (fallback)
            console.warn(`[Scraper] Gagal mengakses ${targetUrl}, mencoba HTTP...`, e.message);
            try {
                const fallbackUrl = `http://${domain}`;
                const response2 = await axios_1.default.get(fallbackUrl, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
                    }
                });
                htmlContent = response2.data;
            }
            catch (e2) {
                return res.status(400).json({
                    success: false,
                    error: `Gagal mengakses website ${domain}. Pastikan website dalam keadaan aktif dan dapat diakses. (${e2.message})`
                });
            }
        }
        // Membersihkan HTML kasar (Buang Script, Style, dan Tag HTML lainnya untuk menyisakan teks)
        // Walaupun kasar (tanpa cheerio), cukup efektif untuk LLM
        let cleanText = htmlContent
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        // Batasi teks maksimal ~10,000 karakter agar tidak membebani limit token AI
        if (cleanText.length > 10000) {
            cleanText = cleanText.substring(0, 10000);
        }
        const genAI = new generative_ai_1.GoogleGenerativeAI(setting.geminiApiKey);
        const targetLang = setting.tenant?.language === 'en' ? 'ENGLISH' : 'INDONESIA';
        let prompt = '';
        if (targetLang === 'ENGLISH') {
            prompt = `You are an SEO & GEO (Generative Engine Optimization) expert.
Here is the raw text content (extracted from HTML) of the website: ${domain}

WEBSITE TEXT:
"""
${cleanText}
"""

YOUR TASK:
Analyze the text above and determine:
1. The most accurate, specific, and commercial "Business Niche" (or main focus) for this website. (e.g. "Luxury Villa Rental in Bali", "Specialist Orthopedic Clinic", "Custom Furniture Workshop").
2. 10-15 "Primary Target Keywords" that will effectively rank for Google Search and ChatGPT GEO Search for this business. Separate each keyword with a COMMA.

IMPORTANT: Respond ONLY with pure valid JSON without markdown.
MANDATORY: Both "businessNiche" and "targetKeywords" MUST be in ENGLISH.

Example:
{
  "businessNiche": "Smartphone & Apple Device Repair in Bali",
  "targetKeywords": "iphone repair bali, screen replacement canggu, macbook service denpasar"
}
`;
        }
        else {
            prompt = `Anda adalah seorang pakar SEO dan GEO (Generative Engine Optimization).
Berikut ini adalah konten teks (hasil ekstraksi dari HTML) dari website: ${domain}

KONTEN TEKS WEBSITE:
"""
${cleanText}
"""

TUGAS ANDA:
Analisis teks di atas dan tentukan:
1. "Bidang Bisnis / Topik Utama" yang paling akurat, spesifik, dan bernilai komersial untuk website ini. (Contoh: "Jasa Rental Mobil Mewah di Bali", "Klinik Fisioterapi Olahraga", "Jasa Arsitek Rumah Tropis").
2. Temukan 10-15 "Target Keywords Utama" yang paling relevan untuk menembus SEO Google dan SEO ChatGPT (GEO) khusus untuk bisnis ini. Pisahkan masing-masing kata kunci dengan KOMA.

PENTING: Jawab hanya dengan format JSON murni tanpa markdown.
WAJIB: Isi dari "businessNiche" dan "targetKeywords" HARUS ditulis menggunakan bahasa INDONESIA.

Contoh:
{
  "businessNiche": "Jasa Rental Mobil Mewah Bali",
  "targetKeywords": "Sewa mobil alphard bali, jasa rental mobil murah, sewa mobil lepas kunci"
}
`;
        }
        const text = await (0, gemini_1.generateWithFallback)(genAI, prompt, { jsonMode: true });
        let parsedData;
        try {
            const cleanedJsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            parsedData = JSON.parse(cleanedJsonText);
        }
        catch (e) {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                parsedData = JSON.parse(match[0]);
            }
            else {
                throw new Error('Format balasan AI tidak dapat dipahami.');
            }
        }
        res.json({ success: true, data: parsedData });
    }
    catch (error) {
        console.error('[Scraper Error]', error);
        let errorMessage = error.message || 'Gagal menganalisis website.';
        if (errorMessage.includes('429 Too Many Requests') || errorMessage.includes('Quota exceeded')) {
            errorMessage = 'Peringatan: Limit API Gemini Anda (Requests Per Minute/Day) telah habis. Silakan tunggu sekitar 1-2 menit sebelum mencoba lagi, atau gunakan API Key Gemini berbayar/baru.';
        }
        res.status(500).json({ success: false, error: errorMessage });
    }
});
//# sourceMappingURL=scraper.js.map