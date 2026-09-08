"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seoWritingRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const generative_ai_1 = require("@google/generative-ai");
const gemini_1 = require("../lib/gemini");
exports.seoWritingRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Analisis teks secara realtime (berbasis algoritma lokal, bukan AI)
exports.seoWritingRouter.post('/analyze', async (req, res) => {
    try {
        const { text, targetKeywords } = req.body;
        if (!text) {
            return res.json({
                success: true,
                data: {
                    seoScore: 0,
                    readabilityScore: 0,
                    wordCount: 0,
                    keywordDensity: []
                }
            });
        }
        const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;
        // Hitung Kepadatan Kata Kunci (Keyword Density)
        const keywordsArray = Array.isArray(targetKeywords) ? targetKeywords : [];
        const keywordDensity = keywordsArray.map(kw => {
            const regex = new RegExp(kw, 'gi');
            const matches = text.match(regex);
            const count = matches ? matches.length : 0;
            const density = wordCount > 0 ? (count / wordCount) * 100 : 0;
            return { keyword: kw, count, density: density.toFixed(2) };
        });
        // Simple Scoring Logic
        let seoScore = 40; // Base score
        if (wordCount > 300)
            seoScore += 20;
        if (wordCount > 800)
            seoScore += 10;
        keywordDensity.forEach(kd => {
            const d = parseFloat(kd.density);
            if (d > 0.5 && d < 2.5)
                seoScore += 15; // Good density
            else if (d >= 2.5)
                seoScore -= 10; // Keyword stuffing penalty
        });
        let readabilityScore = 50;
        if (wordCount > 100) {
            // Dummy logic: teks panjang dengan rata-rata kata pendek lebih mudah dibaca
            readabilityScore = 85;
        }
        // Cap at 100
        seoScore = Math.min(Math.max(seoScore, 0), 100);
        readabilityScore = Math.min(Math.max(readabilityScore, 0), 100);
        res.json({
            success: true,
            data: {
                seoScore,
                readabilityScore,
                wordCount,
                keywordDensity
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Failed to analyze text' });
    }
});
// Menyimpan draft dokumen
exports.seoWritingRouter.post('/save', async (req, res) => {
    try {
        const { tenantId, title, content, targetKeywords, seoScore, readabilityScore } = req.body;
        const doc = await prisma.seoWritingDocument.create({
            data: {
                tenantId,
                title,
                content,
                targetKeywords,
                seoScore,
                readabilityScore
            }
        });
        res.json({ success: true, data: doc });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to save document' });
    }
});
// Generate Artikel menggunakan AI
exports.seoWritingRouter.post('/generate', async (req, res) => {
    try {
        const { topic, targetUrl, tenantId } = req.body;
        if (!topic || !targetUrl || !tenantId) {
            return res.status(400).json({ error: 'Topik, URL Tujuan, dan tenantId diperlukan' });
        }
        let apiKey = process.env.GEMINI_API_KEY;
        if (tenantId !== 'dummy-tenant-id') {
            const setting = await prisma.tenantSetting.findUnique({
                where: { tenantId: String(tenantId) }
            });
            if (setting && setting.geminiApiKey) {
                apiKey = setting.geminiApiKey;
            }
        }
        if (!apiKey) {
            // Dummy response for fallback testing
            if (tenantId === 'dummy-tenant-id') {
                return res.json({
                    success: true,
                    data: {
                        title: `Rahasia Penting Tentang ${topic}`,
                        content: `${topic} adalah sesuatu yang sangat penting untuk dibahas di era digital ini. Dengan menggunakan pendekatan yang tepat, kita bisa mendapatkan hasil yang maksimal.\n\nJika Anda ingin mempelajari lebih lanjut, kunjungi ${targetUrl} untuk informasi selengkapnya.`,
                        keywords: "tips jitu, panduan lengkap, cara terbaik"
                    }
                });
            }
            return res.status(400).json({ error: 'Kunci API Gemini belum diatur di menu Pengaturan.' });
        }
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const prompt = `Anda adalah seorang pakar SEO dan spesialis GEO (Generative Engine Optimization) yang sangat handal.
Tugas Anda adalah menulis draf artikel seputar topik: "${topic}".
Artikel ini ditujukan untuk mempromosikan atau diarahkan ke website target: "${targetUrl}".

Persyaratan artikel:
1. Terdiri dari 3-5 paragraf pendek yang sangat mudah dibaca.
2. Menyebutkan relevansi ke ${targetUrl} secara natural di dalam teks.
3. Mengandung kata kunci turunan yang kuat.

Selain menulis artikel, berikan juga TEPAT 3 hingga 5 KATA KUNCI spesifik yang paling relevan untuk artikel ini (pisahkan dengan koma).
Berikan juga saran judul artikel yang SEO-friendly.

HANYA BERIKAN OUTPUT DALAM FORMAT JSON MURNI (tanpa markdown). Struktur JSON wajib seperti ini:
{
  "title": "Saran Judul Artikel Disini",
  "content": "Isi artikel lengkap disini...",
  "keywords": "kata kunci 1, kata kunci 2, kata kunci 3"
}`;
        const text = await (0, gemini_1.generateWithFallback)(genAI, prompt, { jsonMode: true });
        let parsedData;
        try {
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            parsedData = JSON.parse(cleanText);
        }
        catch (e) {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                parsedData = JSON.parse(match[0]);
            }
            else {
                throw new Error('Format balasan AI tidak sesuai.');
            }
        }
        res.json({ success: true, data: parsedData });
    }
    catch (error) {
        console.error('Error AI Generator:', error);
        res.status(500).json({ success: false, error: 'Failed to generate article' });
    }
});
//# sourceMappingURL=seo-writing.js.map