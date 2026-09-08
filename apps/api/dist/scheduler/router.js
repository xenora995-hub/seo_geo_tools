"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulerRouter = void 0;
const express_1 = require("express");
const node_cron_1 = __importDefault(require("node-cron"));
const middleware_1 = require("../auth/middleware");
const prisma_1 = require("../lib/prisma");
const cron_1 = require("./cron");
const service_1 = require("../generator/service");
const telegraf_1 = require("telegraf");
exports.schedulerRouter = (0, express_1.Router)();
// Public endpoint untuk Cron runner (misal via Hostinger / cPanel Cron Job atau cURL)
// Bisa dipanggil via: GET /api/schedules/runner?secret=... atau POST
exports.schedulerRouter.all('/runner', async (req, res) => {
    const secret = req.query.secret || req.headers['x-cron-secret'] || req.body?.secret;
    const validSecret = process.env.CRON_SECRET || 'seogeo-cron-token-secret';
    if (secret !== validSecret) {
        return res.status(401).json({ success: false, message: 'Invalid or missing cron secret' });
    }
    const { scheduleId, force } = req.query;
    if (scheduleId) {
        const result = await (0, cron_1.runScheduleJob)(String(scheduleId), { force: force === 'true' });
        return res.json(result);
    }
    // Jika tanpa scheduleId, jalankan semua jadwal aktif yang valid hari ini
    const activeSchedules = await prisma_1.prisma.schedule.findMany({
        where: { isActive: true },
        include: { tenant: { include: { setting: true } } }
    });
    const results = [];
    for (const sched of activeSchedules) {
        if (!sched.tenant.isActive)
            continue;
        const resJob = await (0, cron_1.runScheduleJob)(sched.id, { force: force === 'true' });
        results.push({ id: sched.id, name: sched.name, ...resJob });
    }
    return res.json({ success: true, total: results.length, details: results });
});
// Middleware Auth untuk semua endpoint internal di bawah ini
exports.schedulerRouter.use(middleware_1.requireAuth, middleware_1.requireTenant);
exports.schedulerRouter.get('/', async (req, res) => {
    const tenantId = (0, middleware_1.getTenantId)(req);
    const schedules = await prisma_1.prisma.schedule.findMany({
        where: tenantId ? { tenantId } : {},
        orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: schedules });
});
exports.schedulerRouter.post('/', async (req, res) => {
    const tenantId = (0, middleware_1.getTenantId)(req);
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' });
    const { name, cronExpr, topic, startDate, endDate } = req.body;
    if (!node_cron_1.default.validate(cronExpr)) {
        return res.status(400).json({ success: false, message: 'Format jadwal cron tidak valid (contoh: "0 8 * * *")' });
    }
    let parsedStartDate = undefined;
    if (startDate) {
        parsedStartDate = new Date(startDate);
        if (parsedStartDate.getUTCHours() === 0 && parsedStartDate.getUTCMinutes() === 0) {
            parsedStartDate.setUTCHours(0, 0, 0, 0);
        }
    }
    let parsedEndDate = undefined;
    if (endDate) {
        parsedEndDate = new Date(endDate);
        if (parsedEndDate.getUTCHours() === 0 && parsedEndDate.getUTCMinutes() === 0) {
            parsedEndDate.setUTCHours(23, 59, 59, 999);
        }
    }
    const schedule = await prisma_1.prisma.schedule.create({
        data: {
            tenantId,
            name,
            cronExpr,
            topic,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            isActive: true,
        }
    });
    await (0, cron_1.registerCron)(schedule);
    res.status(201).json({ success: true, data: schedule, message: 'Jadwal berhasil dibuat' });
});
exports.schedulerRouter.patch('/:id', async (req, res) => {
    const tenantId = (0, middleware_1.getTenantId)(req);
    const updateData = { ...req.body };
    if (updateData.startDate !== undefined) {
        if (updateData.startDate) {
            const d = new Date(updateData.startDate);
            if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) {
                d.setUTCHours(0, 0, 0, 0);
            }
            updateData.startDate = d;
        }
        else {
            updateData.startDate = null;
        }
    }
    if (updateData.endDate !== undefined) {
        if (updateData.endDate) {
            const d = new Date(updateData.endDate);
            if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) {
                d.setUTCHours(23, 59, 59, 999);
            }
            updateData.endDate = d;
        }
        else {
            updateData.endDate = null;
        }
    }
    await prisma_1.prisma.schedule.updateMany({
        where: { id: req.params.id, ...(tenantId ? { tenantId } : {}) },
        data: updateData
    });
    if (req.body.isActive === false) {
        (0, cron_1.unregisterCron)(req.params.id);
    }
    else {
        const updated = await prisma_1.prisma.schedule.findUnique({ where: { id: req.params.id } });
        if (updated)
            await (0, cron_1.registerCron)(updated);
    }
    res.json({ success: true, message: 'Jadwal diperbarui' });
});
exports.schedulerRouter.delete('/:id', async (req, res) => {
    const tenantId = (0, middleware_1.getTenantId)(req);
    (0, cron_1.unregisterCron)(req.params.id);
    await prisma_1.prisma.schedule.deleteMany({ where: { id: req.params.id, ...(tenantId ? { tenantId } : {}) } });
    res.json({ success: true, message: 'Jadwal dihapus' });
});
// POST /api/schedules/trigger/:id
exports.schedulerRouter.post('/trigger/:id', async (req, res) => {
    try {
        const tenantId = (0, middleware_1.getTenantId)(req);
        if (!tenantId)
            return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' });
        const schedule = await prisma_1.prisma.schedule.findFirst({
            where: { id: req.params.id, tenantId },
            include: { tenant: { include: { setting: true } } }
        });
        if (!schedule)
            return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' });
        const { publishDate } = req.body;
        // Jika tidak ada publishDate spesifik, gunakan runScheduleJob langsung
        if (!publishDate) {
            const result = await (0, cron_1.runScheduleJob)(schedule.id, { force: true });
            if (!result.success) {
                return res.status(500).json({ success: false, message: result.message });
            }
            return res.json({ success: true, data: result, message: 'Artikel berhasil di-generate dan di-publish' });
        }
        // Jika backdate
        const result = await (0, service_1.generateAndPublish)({
            tenantId: schedule.tenantId,
            topic: schedule.topic || undefined,
            publishDate
        });
        await prisma_1.prisma.schedule.update({ where: { id: schedule.id }, data: { lastRun: new Date() } });
        const setting = schedule.tenant.setting;
        if (setting?.telegramBotToken && setting?.telegramChatId && result?.article?.cmsPostUrl) {
            try {
                const bot = new telegraf_1.Telegraf(setting.telegramBotToken);
                const msg = `✅ *Artikel Web ${schedule.tenant.name} publish done (Backdate)!*\n\nJudul: ${result.article.title}\n🔗 Link: ${result.article.cmsPostUrl}`;
                await bot.telegram.sendMessage(setting.telegramChatId, msg, { parse_mode: 'Markdown' });
            }
            catch (telErr) {
                console.error('[SCHEDULER] Gagal kirim notif telegram backdate', telErr);
            }
        }
        res.json({ success: true, data: result, message: 'Artikel backdate berhasil di-publish' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message || 'Gagal memicu jadwal' });
    }
});
//# sourceMappingURL=router.js.map