"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRouter = void 0;
const express_1 = require("express");
const middleware_1 = require("../auth/middleware");
const prisma_1 = require("../lib/prisma");
const telegram_1 = require("../reporter/telegram");
exports.reportRouter = (0, express_1.Router)();
exports.reportRouter.use(middleware_1.requireAuth, middleware_1.requireTenant);
exports.reportRouter.get('/', async (req, res) => {
    const tenantId = (0, middleware_1.getTenantId)(req);
    const reports = await prisma_1.prisma.report.findMany({
        where: tenantId ? { tenantId } : {},
        orderBy: { sentAt: 'desc' },
        take: 30
    });
    res.json({ success: true, data: reports });
});
// Trigger laporan manual
exports.reportRouter.post('/send-daily', async (req, res) => {
    const tenantId = (0, middleware_1.getTenantId)(req);
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' });
    await (0, telegram_1.sendDailyReport)(tenantId);
    res.json({ success: true, message: 'Laporan harian dikirim ke Telegram' });
});
exports.reportRouter.post('/send-weekly', async (req, res) => {
    const tenantId = (0, middleware_1.getTenantId)(req);
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' });
    await (0, telegram_1.sendWeeklyReport)(tenantId);
    res.json({ success: true, message: 'Laporan mingguan dikirim ke Telegram' });
});
//# sourceMappingURL=router.js.map