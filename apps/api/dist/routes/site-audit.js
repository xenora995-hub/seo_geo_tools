"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.siteAuditRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
exports.siteAuditRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Melakukan pemindaian website baru (Google PageSpeed Insights API + fallback simulasi)
exports.siteAuditRouter.post('/scan', async (req, res) => {
    try {
        const { url, tenantId } = req.body;
        if (!url || !tenantId)
            return res.status(400).json({ error: 'URL and tenantId required' });
        const apiKey = process.env.GOOGLE_PSI_API_KEY;
        let auditResult = null;
        // Coba panggil Google PageSpeed Insights API jika API key tersedia
        if (apiKey && apiKey.trim().length > 0) {
            try {
                console.log(`[SITE-AUDIT] Memanggil Google PageSpeed Insights API untuk: ${url}`);
                const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${apiKey.trim()}`;
                const response = await axios_1.default.get(psiUrl, { timeout: 35000 });
                const lr = response.data?.lighthouseResult;
                if (lr && lr.categories) {
                    const perfScore = Math.round((lr.categories.performance?.score ?? 0.5) * 100);
                    const accessScore = Math.round((lr.categories.accessibility?.score ?? 0.7) * 100);
                    const seoScore = Math.round((lr.categories.seo?.score ?? 0.8) * 100);
                    const bestScore = Math.round((lr.categories['best-practices']?.score ?? 0.8) * 100);
                    const lcp = lr.audits?.['largest-contentful-paint']?.displayValue || 'N/A';
                    const fid = lr.audits?.['total-blocking-time']?.displayValue || 'N/A';
                    const cls = lr.audits?.['cumulative-layout-shift']?.displayValue || 'N/A';
                    // Filter opportunities where score < 0.9 and details exist
                    const opportunities = [];
                    if (lr.audits) {
                        for (const [auditKey, audit] of Object.entries(lr.audits)) {
                            if (audit.score !== null && audit.score < 0.9 && audit.details) {
                                opportunities.push({
                                    id: auditKey,
                                    title: audit.title,
                                    description: audit.description,
                                    score: audit.score,
                                    displayValue: audit.displayValue || null
                                });
                            }
                        }
                    }
                    const errorsCount = opportunities.filter(o => o.score < 0.5).length;
                    const warningsCount = opportunities.filter(o => o.score >= 0.5 && o.score < 0.9).length;
                    const noticesCount = Math.max(0, 10 - errorsCount);
                    auditResult = {
                        healthScore: perfScore,
                        performanceScore: perfScore,
                        accessibilityScore: accessScore,
                        seoScore: seoScore,
                        bestPracticesScore: bestScore,
                        lcp,
                        fid,
                        cls,
                        opportunities,
                        errors: errorsCount,
                        warnings: warningsCount,
                        notices: noticesCount,
                        simulated: false
                    };
                }
            }
            catch (psiError) {
                console.warn(`[SITE-AUDIT] PSI API call gagal (${psiError.message}), fallback ke simulasi.`);
            }
        }
        // Fallback ke simulasi jika API key tidak diset atau pemanggilan gagal
        if (!auditResult) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const healthScore = Math.floor(Math.random() * (95 - 40 + 1) + 40); // 40-95
            const errors = Math.floor(Math.random() * 20);
            const warnings = Math.floor(Math.random() * 50) + 10;
            const notices = Math.floor(Math.random() * 100) + 50;
            auditResult = {
                healthScore,
                performanceScore: healthScore,
                accessibilityScore: Math.floor(Math.random() * 20) + 75,
                seoScore: Math.floor(Math.random() * 20) + 80,
                bestPracticesScore: Math.floor(Math.random() * 20) + 75,
                lcp: '2.4 s',
                fid: '140 ms',
                cls: '0.05',
                opportunities: [
                    { id: 'render-blocking-resources', title: 'Eliminate render-blocking resources', score: 0.45, displayValue: 'Hemat hingga 420 ms' },
                    { id: 'unused-javascript', title: 'Reduce unused JavaScript', score: 0.62, displayValue: 'Hemat hingga 150 KiB' }
                ],
                errors,
                warnings,
                notices,
                simulated: true
            };
        }
        const reportData = {
            id: 'report-' + Date.now(),
            tenantId,
            url,
            ...auditResult,
            createdAt: new Date()
        };
        let report = reportData;
        // Simpan ke database jika bukan dummy tenant
        if (tenantId !== 'dummy-tenant-id') {
            try {
                const saved = await prisma.siteAuditReport.create({
                    data: {
                        tenantId,
                        url,
                        healthScore: auditResult.healthScore,
                        errors: auditResult.errors,
                        warnings: auditResult.warnings,
                        notices: auditResult.notices
                    }
                });
                report = { ...reportData, id: saved.id, createdAt: saved.createdAt };
            }
            catch (dbError) {
                console.error("Database error saving report:", dbError);
                report = reportData;
            }
        }
        res.json({ success: true, data: report });
    }
    catch (error) {
        console.error('[Site Audit Error]', error);
        res.status(500).json({ success: false, error: error.message || 'Audit failed' });
    }
});
// Auto Fix (Simulasi AI memperbaiki CMS)
exports.siteAuditRouter.post('/auto-fix', async (req, res) => {
    try {
        const { reportId } = req.body;
        if (!reportId)
            return res.status(400).json({ error: 'reportId required' });
        if (reportId.startsWith('dummy-report')) {
            return res.json({
                success: true,
                data: {
                    id: reportId,
                    healthScore: 100,
                    errors: 0,
                    warnings: 0,
                    notices: 0
                }
            });
        }
        const report = await prisma.siteAuditReport.update({
            where: { id: reportId },
            data: {
                healthScore: 100,
                errors: 0,
                warnings: 0,
                notices: 0
            }
        });
        res.json({ success: true, data: report });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Auto fix failed' });
    }
});
// Mengambil histori
exports.siteAuditRouter.get('/history', async (req, res) => {
    try {
        const { tenantId } = req.query;
        const history = await prisma.siteAuditReport.findMany({
            where: tenantId ? { tenantId: String(tenantId) } : undefined,
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: history });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch history' });
    }
});
//# sourceMappingURL=site-audit.js.map