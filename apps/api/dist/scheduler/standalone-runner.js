"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStandaloneSchedules = runStandaloneSchedules;
require("dotenv/config");
const prisma_1 = require("../lib/prisma");
const cron_1 = require("./cron");
async function runStandaloneSchedules(options = {}) {
    const startTime = new Date().toISOString();
    console.log(`[STANDALONE-RUNNER] [${startTime}] Memulai eksekusi jadwal...`);
    let targetSchedules = [];
    if (options.scheduleId) {
        const s = await prisma_1.prisma.schedule.findUnique({
            where: { id: options.scheduleId },
            include: { tenant: { include: { setting: true } } }
        });
        if (!s) {
            console.error(`[STANDALONE-RUNNER] Jadwal ID ${options.scheduleId} tidak ditemukan.`);
            return { success: false, message: `Jadwal ${options.scheduleId} tidak ditemukan` };
        }
        targetSchedules = [s];
    }
    else {
        targetSchedules = await prisma_1.prisma.schedule.findMany({
            where: { isActive: true },
            include: { tenant: { include: { setting: true } } }
        });
    }
    console.log(`[STANDALONE-RUNNER] Ditemukan ${targetSchedules.length} jadwal aktif untuk diperiksa.`);
    const results = [];
    for (const schedule of targetSchedules) {
        if (!schedule.tenant.isActive) {
            console.log(`[STANDALONE-RUNNER] Tenant ${schedule.tenant.name} non-aktif. Dilewati.`);
            continue;
        }
        const timezone = schedule.tenant.setting?.timezone || 'Asia/Makassar';
        const now = new Date();
        const todayStr = (0, cron_1.getDateStringInTimezone)(now, timezone);
        // Cek apakah sudah pernah berjalan hari ini jika tidak force
        if (!options.force && schedule.lastRun) {
            const lastRunStr = (0, cron_1.getDateStringInTimezone)(schedule.lastRun, timezone);
            if (lastRunStr === todayStr) {
                console.log(`[STANDALONE-RUNNER] ⏳ Jadwal ${schedule.name} (${schedule.tenant.name}) sudah berjalan hari ini (${todayStr}). Melewati eksekusi ganda.`);
                results.push({
                    id: schedule.id,
                    name: schedule.name,
                    tenant: schedule.tenant.name,
                    skipped: true,
                    reason: `Sudah berjalan hari ini (${todayStr})`
                });
                continue;
            }
        }
        // Cek rentang tanggal jadwal
        if (!options.force) {
            if (schedule.startDate) {
                const startStr = (0, cron_1.getDateStringInTimezone)(schedule.startDate, timezone);
                if (todayStr < startStr) {
                    console.log(`[STANDALONE-RUNNER] ⏳ Jadwal ${schedule.name} belum mencapai tanggal mulai (${startStr}).`);
                    continue;
                }
            }
            if (schedule.endDate) {
                const endStr = (0, cron_1.getDateStringInTimezone)(schedule.endDate, timezone);
                if (todayStr > endStr) {
                    console.log(`[STANDALONE-RUNNER] 🛑 Jadwal ${schedule.name} sudah kedaluwarsa (${endStr}). Menonaktifkan...`);
                    await prisma_1.prisma.schedule.update({ where: { id: schedule.id }, data: { isActive: false } });
                    continue;
                }
            }
        }
        console.log(`[STANDALONE-RUNNER] 🚀 Menjalankan jadwal: "${schedule.name}" untuk "${schedule.tenant.name}" (Timezone: ${timezone}, Hari ini: ${todayStr})...`);
        try {
            const jobResult = await (0, cron_1.runScheduleJob)(schedule.id, { force: options.force });
            console.log(`[STANDALONE-RUNNER] Hasil eksekusi ${schedule.name}:`, jobResult.success ? '✅ SUKSES' : '❌ GAGAL', jobResult.message);
            results.push({
                id: schedule.id,
                name: schedule.name,
                tenant: schedule.tenant.name,
                ...jobResult
            });
        }
        catch (err) {
            console.error(`[STANDALONE-RUNNER] Error mengeksekusi ${schedule.name}:`, err.message);
            results.push({
                id: schedule.id,
                name: schedule.name,
                tenant: schedule.tenant.name,
                success: false,
                message: err.message
            });
        }
    }
    console.log(`[STANDALONE-RUNNER] Selesai memeriksa semua jadwal. Total dieksekusi/diperiksa: ${results.length}`);
    return { success: true, total: results.length, details: results };
}
// Jika dijalankan langsung via CLI: node standalone-runner.js [--force] [--scheduleId=...]
if (require.main === module) {
    const args = process.argv.slice(2);
    const isForce = args.includes('--force');
    const scheduleArg = args.find(a => a.startsWith('--scheduleId='));
    const scheduleId = scheduleArg ? scheduleArg.split('=')[1] : undefined;
    runStandaloneSchedules({ force: isForce, scheduleId })
        .then((res) => {
        console.log(JSON.stringify(res, null, 2));
        process.exit(0);
    })
        .catch((err) => {
        console.error('[STANDALONE-RUNNER] FATAL ERROR:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=standalone-runner.js.map