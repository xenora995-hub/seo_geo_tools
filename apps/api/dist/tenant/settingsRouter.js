"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRouter = void 0;
const express_1 = require("express");
const middleware_1 = require("../auth/middleware");
const prisma_1 = require("../lib/prisma");
const bot_1 = require("../telegram/bot");
const gemini_1 = require("../lib/gemini");
exports.settingsRouter = (0, express_1.Router)();
exports.settingsRouter.use(middleware_1.requireAuth, middleware_1.requireTenant);
// GET /api/settings
exports.settingsRouter.get('/', async (req, res) => {
    try {
        const tenantId = (0, middleware_1.getTenantId)(req);
        if (!tenantId) {
            return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' });
        }
        let setting = await prisma_1.prisma.tenantSetting.findUnique({
            where: { tenantId },
            include: { tenant: { select: { id: true, name: true, domain: true, cmsType: true, cmsUrl: true, cmsApiKey: true, language: true, isActive: true } } }
        });
        if (!setting) {
            setting = await prisma_1.prisma.tenantSetting.create({
                data: {
                    tenantId,
                    geminiApiKey: '',
                    targetKeywords: [],
                    competitors: [],
                },
                include: { tenant: { select: { id: true, name: true, domain: true, cmsType: true, cmsUrl: true, cmsApiKey: true, language: true, isActive: true } } }
            });
        }
        res.json({ success: true, data: setting });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// PATCH /api/settings
exports.settingsRouter.patch('/', async (req, res) => {
    try {
        const tenantId = (0, middleware_1.getTenantId)(req);
        if (!tenantId) {
            return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' });
        }
        const { geminiApiKey, telegramBotToken, telegramChatId, articlesPerDay, imageStyle, targetKeywords, competitors, cmsType, cmsUrl, cmsApiKey, language, businessNiche, customPrompt, timezone, googleServiceAccountJson, } = req.body;
        const setting = await prisma_1.prisma.tenantSetting.upsert({
            where: { tenantId },
            create: {
                tenantId,
                geminiApiKey: geminiApiKey || '',
                telegramBotToken: telegramBotToken || null,
                telegramChatId: telegramChatId || null,
                articlesPerDay: articlesPerDay !== undefined ? Number(articlesPerDay) : 1,
                imageStyle: imageStyle || 'professional photography, clean background',
                businessNiche: businessNiche || null,
                targetKeywords: Array.isArray(targetKeywords) ? targetKeywords : [],
                competitors: Array.isArray(competitors) ? competitors : [],
                customPrompt: customPrompt || null,
                timezone: timezone || 'Asia/Jakarta',
            },
            update: {
                ...(geminiApiKey !== undefined ? { geminiApiKey } : {}),
                ...(telegramBotToken !== undefined ? { telegramBotToken } : {}),
                ...(telegramChatId !== undefined ? { telegramChatId } : {}),
                ...(articlesPerDay !== undefined ? { articlesPerDay: Number(articlesPerDay) } : {}),
                ...(imageStyle !== undefined ? { imageStyle } : {}),
                ...(businessNiche !== undefined ? { businessNiche } : {}),
                ...(targetKeywords !== undefined ? { targetKeywords: Array.isArray(targetKeywords) ? targetKeywords : [] } : {}),
                ...(competitors !== undefined ? { competitors: Array.isArray(competitors) ? competitors : [] } : {}),
                ...(customPrompt !== undefined ? { customPrompt } : {}),
                ...(timezone !== undefined ? { timezone } : {}),
                ...(googleServiceAccountJson !== undefined ? { googleServiceAccountJson } : {}),
            }
        });
        // Jika ada update data tenant (cmsUrl, cmsApiKey, dll)
        if (cmsType || cmsUrl || cmsApiKey || language) {
            await prisma_1.prisma.tenant.update({
                where: { id: tenantId },
                data: {
                    ...(cmsType ? { cmsType } : {}),
                    ...(cmsUrl ? { cmsUrl } : {}),
                    ...(cmsApiKey ? { cmsApiKey } : {}),
                    ...(language ? { language } : {}),
                }
            });
        }
        // Auto-restart bot Telegram jika token/chatId diupdate
        if (setting.telegramBotToken && setting.telegramBotToken.length > 20) {
            try {
                (0, bot_1.startBotForTenant)(tenantId, setting.telegramBotToken, setting.telegramChatId);
            }
            catch (e) {
                console.error('[TELEGRAM] Gagal restart bot dari pengaturan:', e);
            }
        }
        res.json({ success: true, data: setting, message: 'Pengaturan berhasil disimpan' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// POST /api/settings/generate-keywords
exports.settingsRouter.post('/generate-keywords', async (req, res) => {
    try {
        const tenantId = (0, middleware_1.getTenantId)(req);
        if (!tenantId)
            return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' });
        const { businessNiche, domain } = req.body;
        if (!businessNiche)
            return res.status(400).json({ success: false, message: 'Bidang bisnis diperlukan' });
        const setting = await prisma_1.prisma.tenantSetting.findUnique({ where: { tenantId }, include: { tenant: true } });
        if (!setting || !setting.geminiApiKey) {
            return res.status(400).json({ success: false, message: 'Kunci Akses Gemini belum diatur' });
        }
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(setting.geminiApiKey);
        const targetLang = setting.tenant.language === 'en' ? 'Bahasa Inggris (English)' : 'Bahasa Indonesia';
        const prompt = `Sebagai Pakar SEO Spesialis, analisis bisnis ini:
Bidang/Niche: "${businessNiche}"
Domain Website: "${domain || 'belum ada'}"
Bahasa Target Keywords: ${targetLang}

Tugas Anda:
1. Berikan 10-15 target keyword SEO lokal dan spesifik terbaik (long-tail & short-tail) yang memiliki intent komersial tinggi. PENTING: SEMUA KEYWORD HARUS DITULIS DALAM ${targetLang.toUpperCase()} karena target marketnya sesuai dengan bahasa tersebut.
2. Identifikasi 3-5 nama domain website kompetitor nyata di industri ini (atau jika lokal, berikan contoh kompetitor umum).

Balas HANYA dalam JSON valid:
{
  "keywords": ["keyword 1", "keyword 2", "..."],
  "competitors": ["kompetitor1.com", "kompetitor2.co.id", "..."]
}`;
        const text = await (0, gemini_1.generateWithFallback)(genAI, prompt, { jsonMode: true });
        let parsed = {};
        try {
            parsed = JSON.parse(text);
        }
        catch {
            const match = text.match(/\{[\s\S]*\}/);
            if (match)
                parsed = JSON.parse(match[0]);
        }
        res.json({ success: true, data: parsed });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
//# sourceMappingURL=settingsRouter.js.map