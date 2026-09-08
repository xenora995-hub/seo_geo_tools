"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contentGapRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const generative_ai_1 = require("@google/generative-ai");
const content_gap_ai_1 = require("../generator/content-gap-ai");
exports.contentGapRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
exports.contentGapRouter.post('/compare', async (req, res) => {
    try {
        let { myDomain, tenantId, niche, location } = req.body;
        if (!myDomain) {
            return res.status(400).json({ error: 'myDomain is required' });
        }
        if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
            tenantId = 'dummy-tenant-id'; // fallback
        }
        // Ambil API Key dari pengaturan tenant
        let apiKey = process.env.GEMINI_API_KEY;
        let language = 'id';
        let targetKeywords = [];
        if (tenantId !== 'dummy-tenant-id') {
            const setting = await prisma.tenantSetting.findUnique({
                where: { tenantId }
            });
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId }
            });
            if (tenant?.language) {
                language = tenant.language;
            }
            if (setting && setting.geminiApiKey) {
                apiKey = setting.geminiApiKey;
            }
            if (!niche && setting?.businessNiche) {
                niche = setting.businessNiche;
            }
            if (!location) {
                location = 'Bali, Indonesia';
            }
            if (setting?.targetKeywords && setting.targetKeywords.length > 0) {
                targetKeywords = setting.targetKeywords;
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
                });
            }
            return res.status(400).json({ error: 'Kunci API Gemini belum diatur di menu Pengaturan.' });
        }
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const gaps = await (0, content_gap_ai_1.generateContentGapKeywords)(genAI, myDomain, niche, location, language, targetKeywords);
        res.json({ success: true, data: gaps });
    }
    catch (error) {
        console.error('[Content Gap Error]', error);
        res.status(500).json({ success: false, error: error.message || 'Comparison failed' });
    }
});
//# sourceMappingURL=content-gap.js.map