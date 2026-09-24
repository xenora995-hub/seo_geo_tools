"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initScheduler = initScheduler;
exports.checkMissedSchedules = checkMissedSchedules;
exports.getDateStringInTimezone = getDateStringInTimezone;
exports.runScheduleJob = runScheduleJob;
exports.registerCron = registerCron;
exports.unregisterCron = unregisterCron;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = require("../lib/prisma");
const service_1 = require("../generator/service");
const telegram_1 = require("../reporter/telegram");
const telegraf_1 = require("telegraf");
const activeCrons = new Map();
async function initScheduler() {
    console.log('[SCHEDULER] Memuat jadwal dari database...');
    const schedules = await prisma_1.prisma.schedule.findMany({
        where: { isActive: true },
        include: { tenant: { select: { isActive: true } } }
    });
    for (const schedule of schedules) {
        if (!schedule.tenant.isActive)
            continue;
        await registerCron(schedule);
    }
    // Laporan harian - setiap hari jam 23:00
    node_cron_1.default.schedule('0 23 * * *', async () => {
        console.log('[SCHEDULER] Mengirim laporan harian...');
        const tenants = await prisma_1.prisma.tenant.findMany({ where: { isActive: true } });
        for (const tenant of tenants) {
            await (0, telegram_1.sendDailyReport)(tenant.id).catch(console.error);
        }
    });
    // Laporan mingguan - setiap Minggu jam 08:00
    node_cron_1.default.schedule('0 8 * * 0', async () => {
        console.log('[SCHEDULER] Mengirim laporan mingguan...');
        const tenants = await prisma_1.prisma.tenant.findMany({ where: { isActive: true } });
        for (const tenant of tenants) {
            await (0, telegram_1.sendWeeklyReport)(tenant.id).catch(console.error);
        }
    });
    // Catch-up check: 20 detik setelah booting untuk memeriksa jika ada jadwal yang terlewat karena downtime
    setTimeout(async () => {
        await checkMissedSchedules().catch(console.error);
    }, 20000);
    // Polling pemulihan berkala (menit 15 dan 45 setiap jam) untuk menangkal sleep/downtime Hostinger
    node_cron_1.default.schedule('15,45 * * * *', async () => {
        await checkMissedSchedules().catch(console.error);
    });
    console.log(`[SCHEDULER] ✅ ${schedules.length} jadwal aktif dimuat`);
}
async function checkMissedSchedules() {
    console.log('[SCHEDULER] 🔍 Memeriksa jadwal yang terlewat hari ini...');
    const schedules = await prisma_1.prisma.schedule.findMany({
        where: { isActive: true },
        include: { tenant: { include: { setting: true } } }
    });
    for (const schedule of schedules) {
        if (!schedule.tenant.isActive)
            continue;
        const timezone = schedule.tenant.setting?.timezone || 'Asia/Makassar';
        const now = new Date();
        const todayStr = getDateStringInTimezone(now, timezone);
        // Cek apakah sudah berjalan hari ini
        if (schedule.lastRun) {
            const lastRunStr = getDateStringInTimezone(schedule.lastRun, timezone);
            if (lastRunStr === todayStr)
                continue;
        }
        // Cek rentang tanggal jadwal
        if (schedule.startDate) {
            const startStr = getDateStringInTimezone(schedule.startDate, timezone);
            if (todayStr < startStr)
                continue;
        }
        if (schedule.endDate) {
            const endStr = getDateStringInTimezone(schedule.endDate, timezone);
            if (todayStr > endStr)
                continue;
        }
        // Periksa apakah waktu jadwal telah terlewati hari ini
        const parts = schedule.cronExpr.trim().split(/\s+/);
        if (parts.length >= 2) {
            const targetMin = parseInt(parts[0], 10);
            const targetHour = parseInt(parts[1], 10);
            if (!isNaN(targetHour) && !isNaN(targetMin)) {
                const timeFormatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: timezone,
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: false
                });
                const timeParts = timeFormatter.formatToParts(now);
                const currentHour = parseInt(timeParts.find(p => p.type === 'hour')?.value || '0', 10);
                const currentMin = parseInt(timeParts.find(p => p.type === 'minute')?.value || '0', 10);
                if (currentHour > targetHour || (currentHour === targetHour && currentMin >= targetMin)) {
                    console.log(`[SCHEDULER] ⚡ Mendeteksi jadwal terlewat hari ini: "${schedule.name}" (${schedule.tenant.name}). Mengeksekusi catch-up sekarang...`);
                    await runScheduleJob(schedule.id).catch(err => console.error(`[SCHEDULER] Gagal eksekusi catch-up ${schedule.name}:`, err));
                }
            }
        }
    }
}
function getDateStringInTimezone(d, tz = 'Asia/Jakarta') {
    try {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(d);
    }
    catch {
        return d.toISOString().split('T')[0];
    }
}
async function runScheduleJob(scheduleId, options) {
    const schedule = await prisma_1.prisma.schedule.findUnique({
        where: { id: scheduleId },
        include: { tenant: { include: { setting: true } } }
    });
    if (!schedule) {
        return { success: false, message: `Jadwal ID ${scheduleId} tidak ditemukan` };
    }
    if (!schedule.isActive && !options?.force) {
        return { success: false, message: `Jadwal ${schedule.name} sedang tidak aktif` };
    }
    if (!schedule.tenant.isActive) {
        return { success: false, message: `Tenant ${schedule.tenant.name} sedang non-aktif` };
    }
    const setting = schedule.tenant.setting;
    const timezone = setting?.timezone || 'Asia/Jakarta';
    const now = new Date();
    const todayStr = getDateStringInTimezone(now, timezone);
    if (!options?.force) {
        if (schedule.lastRun) {
            const lastRunStr = getDateStringInTimezone(schedule.lastRun, timezone);
            if (lastRunStr === todayStr) {
                const msg = `⏳ Jadwal ${schedule.name} sudah dieksekusi hari ini (${todayStr}). Melewati eksekusi ganda.`;
                console.log(`[SCHEDULER] ${msg}`);
                return { success: true, message: msg };
            }
        }
        if (schedule.startDate) {
            const startStr = getDateStringInTimezone(schedule.startDate, timezone);
            if (todayStr < startStr) {
                const msg = `⏳ Jadwal ${schedule.name} belum saatnya dimulai (Hari ini: ${todayStr}, Mulai: ${startStr})`;
                console.log(`[SCHEDULER] ${msg}`);
                return { success: false, message: msg };
            }
        }
        if (schedule.endDate) {
            const endStr = getDateStringInTimezone(schedule.endDate, timezone);
            if (todayStr > endStr) {
                const msg = `🛑 Jadwal ${schedule.name} sudah kedaluwarsa (Hari ini: ${todayStr}, Berakhir: ${endStr}). Menonaktifkan jadwal...`;
                console.log(`[SCHEDULER] ${msg}`);
                await prisma_1.prisma.schedule.update({ where: { id: schedule.id }, data: { isActive: false } });
                unregisterCron(schedule.id);
                return { success: false, message: msg };
            }
        }
    }
    try {
        const result = await (0, service_1.generateAndPublish)({ tenantId: schedule.tenantId, topic: schedule.topic || undefined });
        await prisma_1.prisma.schedule.update({ where: { id: schedule.id }, data: { lastRun: new Date() } });
        console.log(`[SCHEDULER] ✅ Artikel berhasil diposting untuk jadwal: ${schedule.name} (${schedule.id})`);
        // Notifikasi Telegram (Sukses)
        if (setting?.telegramBotToken && setting?.telegramChatId && result?.article?.cmsPostUrl) {
            try {
                const bot = new telegraf_1.Telegraf(setting.telegramBotToken);
                const msg = `✅ *Artikel Web ${schedule.tenant.name} publish done!*\n\nJudul: ${result.article.title}\n🔗 Link: ${result.article.cmsPostUrl}`;
                await bot.telegram.sendMessage(setting.telegramChatId, msg, { parse_mode: 'Markdown' });
            }
            catch (telErr) {
                console.error('[SCHEDULER] Gagal kirim notif telegram sukses', telErr);
            }
        }
        return { success: true, message: 'Artikel berhasil di-generate dan di-publish', article: result?.article };
    }
    catch (err) {
        console.error(`[SCHEDULER] ❌ Gagal: ${err.message}`);
        // Notifikasi Telegram (Gagal)
        if (setting?.telegramBotToken && setting?.telegramChatId) {
            try {
                const bot = new telegraf_1.Telegraf(setting.telegramBotToken);
                const msg = `❌ *Artikel Web ${schedule.tenant.name} publish gagal!*\n\nError: ${err.message}\n⏳ Silakan periksa limit kuota AI atau konfigurasi CMS.`;
                await bot.telegram.sendMessage(setting.telegramChatId, msg, { parse_mode: 'Markdown' });
            }
            catch (telErr) {
                console.error('[SCHEDULER] Gagal kirim notif telegram error', telErr);
            }
        }
        return { success: false, message: err.message || 'Gagal memproses pembuatan artikel' };
    }
}
async function registerCron(schedule) {
    // Stop yang lama kalau ada
    if (activeCrons.has(schedule.id)) {
        activeCrons.get(schedule.id).stop();
    }
    if (!node_cron_1.default.validate(schedule.cronExpr)) {
        console.warn(`[SCHEDULER] Cron expression tidak valid: ${schedule.cronExpr}`);
        return;
    }
    const setting = await prisma_1.prisma.tenantSetting.findUnique({ where: { tenantId: schedule.tenantId } });
    const timezone = setting?.timezone || 'Asia/Jakarta';
    const task = node_cron_1.default.schedule(schedule.cronExpr, async () => {
        console.log(`[SCHEDULER] ⏰ Memicu eksekusi cron: ${schedule.id} (Timezone: ${timezone})`);
        // Jeda acak 1 - 20 detik untuk mencegah race condition / 429 jika ada beberapa tenant dijadwalkan bersamaan
        const jitterDelay = Math.floor(Math.random() * 20000) + 1000;
        setTimeout(async () => {
            await runScheduleJob(schedule.id);
        }, jitterDelay);
    }, { timezone });
    activeCrons.set(schedule.id, task);
}
function unregisterCron(scheduleId) {
    if (activeCrons.has(scheduleId)) {
        activeCrons.get(scheduleId).stop();
        activeCrons.delete(scheduleId);
    }
}
//# sourceMappingURL=cron.js.map