"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlerRouter = void 0;
const express_1 = require("express");
const middleware_1 = require("../auth/middleware");
const google_1 = require("./google");
const chatgpt_1 = require("./chatgpt");
const prisma_1 = require("../lib/prisma");
exports.crawlerRouter = (0, express_1.Router)();
exports.crawlerRouter.use(middleware_1.requireAuth, middleware_1.requireTenant);
// Simple in-memory cache to prevent Google/AI rate limits on page refresh
const cache = new Map();
const CACHE_DURATION_MS = 1000 * 60 * 60; // 1 hour
// GET /api/crawler/rankings
exports.crawlerRouter.get('/rankings', async (req, res) => {
    try {
        const tenantId = (0, middleware_1.getTenantId)(req);
        if (!tenantId)
            return res.status(400).json({ success: false, message: 'Tenant ID required' });
        const cached = cache.get(tenantId);
        if (cached && cached.rankings && (Date.now() - cached.time < CACHE_DURATION_MS)) {
            return res.json({ success: true, data: cached.rankings });
        }
        // Try fetch from DB Report if not in cache
        const latestReport = await prisma_1.prisma.report.findFirst({
            where: { tenantId, type: 'WEEKLY' },
            orderBy: { sentAt: 'desc' }
        });
        if (latestReport && latestReport.data.rankings) {
            const rankings = latestReport.data.rankings;
            cache.set(tenantId, { ...cached, time: Date.now(), rankings });
            return res.json({ success: true, data: rankings });
        }
        // If completely empty, we can trigger a manual check or return empty array
        // Since we don't want to auto-trigger google bot on load, return empty
        res.json({ success: true, data: [] });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// GET /api/crawler/ai-visibility
exports.crawlerRouter.get('/ai-visibility', async (req, res) => {
    try {
        const tenantId = (0, middleware_1.getTenantId)(req);
        if (!tenantId)
            return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' });
        const cached = cache.get(tenantId);
        if (cached && cached.visibility && (Date.now() - cached.time < CACHE_DURATION_MS)) {
            return res.json({ success: true, data: cached.visibility });
        }
        // Try fetch from DB Report if not in cache
        const latestReport = await prisma_1.prisma.report.findFirst({
            where: { tenantId, type: 'WEEKLY' },
            orderBy: { sentAt: 'desc' }
        });
        if (latestReport && latestReport.data.visibility) {
            const visibility = latestReport.data.visibility;
            cache.set(tenantId, { ...cached, time: Date.now(), visibility });
            return res.json({ success: true, data: visibility });
        }
        res.json({ success: true, data: [] });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// POST /api/crawler/run — run both checks
exports.crawlerRouter.post('/run', async (req, res) => {
    try {
        const tenantId = (0, middleware_1.getTenantId)(req);
        if (!tenantId)
            return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' });
        const setting = await prisma_1.prisma.tenantSetting.findUnique({
            where: { tenantId }
        });
        if (!setting)
            return res.status(400).json({ success: false, message: 'Pengaturan tidak ditemukan' });
        // Check 7-day cooldown
        if (setting.lastCrawlerRun) {
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - setting.lastCrawlerRun.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays < 7) {
                const nextRun = new Date(setting.lastCrawlerRun);
                nextRun.setDate(nextRun.getDate() + 7);
                return res.status(429).json({
                    success: false,
                    message: `Laporan sudah ditarik minggu ini. Anda baru bisa menarik laporan lagi pada ${nextRun.toLocaleDateString('id-ID')}`
                });
            }
        }
        const [rankings, visibility] = await Promise.all([
            (0, google_1.checkGoogleRankings)(tenantId),
            (0, chatgpt_1.checkAiVisibility)(tenantId)
        ]);
        // Update cache with fresh data
        cache.set(tenantId, { time: Date.now(), rankings, visibility });
        // Simpan ke dummy/weekly report buat history
        await prisma_1.prisma.report.create({
            data: {
                tenantId,
                type: 'WEEKLY',
                data: { rankings, visibility },
                sentAt: new Date()
            }
        });
        // Update lastCrawlerRun di DB
        await prisma_1.prisma.tenantSetting.update({
            where: { tenantId },
            data: { lastCrawlerRun: new Date() }
        });
        res.json({
            success: true,
            data: { rankings, visibility },
            message: 'Laporan SEO mingguan berhasil diperbarui!'
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
//# sourceMappingURL=router.js.map