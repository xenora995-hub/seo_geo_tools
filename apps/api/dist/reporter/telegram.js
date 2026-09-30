"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDailyReport = sendDailyReport;
exports.sendWeeklyReport = sendWeeklyReport;
const telegraf_1 = require("telegraf");
const prisma_1 = require("../lib/prisma");
function getBot(token) {
    const finalToken = token || process.env.TELEGRAM_BOT_TOKEN;
    if (!finalToken)
        throw new Error('Token bot telegram tidak tersedia');
    return new telegraf_1.Telegraf(finalToken);
}
function formatDate(d) {
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}
async function sendDailyReport(tenantId) {
    const setting = await prisma_1.prisma.tenantSetting.findUnique({ where: { tenantId } });
    const tenant = await prisma_1.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!setting?.telegramChatId || !tenant)
        return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const articles = await prisma_1.prisma.article.findMany({
        where: { tenantId, createdAt: { gte: today } },
        orderBy: { createdAt: 'desc' }
    });
    const published = articles.filter(a => a.status === 'PUBLISHED');
    const failed = articles.filter(a => a.status === 'FAILED');
    const nextSchedule = await prisma_1.prisma.schedule.findFirst({
        where: { tenantId, isActive: true },
        orderBy: { nextRun: 'asc' }
    });
    let msg = `✅ *LAPORAN HARIAN — ${formatDate(new Date())}*\n`;
    msg += `Website: *${tenant.name}* (${tenant.domain})\n\n`;
    msg += `📝 *Artikel dipublikasi: ${published.length}*\n`;
    for (const a of published) {
        msg += `  • ${a.title}\n`;
        if (a.cmsPostUrl)
            msg += `    🔗 ${a.cmsPostUrl}\n`;
    }
    if (failed.length > 0) {
        msg += `\n⚠️ *Gagal: ${failed.length} artikel*\n`;
        for (const a of failed) {
            msg += `  ❌ ${a.title}\n`;
            if (a.errorLog)
                msg += `    Error: ${a.errorLog.slice(0, 100)}\n`;
        }
    }
    if (nextSchedule?.nextRun) {
        msg += `\n🕐 Jadwal berikutnya: ${nextSchedule.nextRun.toLocaleString('id-ID')}`;
    }
    const bot = getBot(setting.telegramBotToken);
    await bot.telegram.sendMessage(setting.telegramChatId, msg, { parse_mode: 'Markdown' });
    // Simpan ke DB
    await prisma_1.prisma.report.create({
        data: { tenantId, type: 'DAILY', data: { published: published.length, failed: failed.length, articles: published.map(a => ({ title: a.title, url: a.cmsPostUrl })) } }
    });
}
async function sendWeeklyReport(tenantId) {
    const setting = await prisma_1.prisma.tenantSetting.findUnique({ where: { tenantId } });
    const tenant = await prisma_1.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!setting?.telegramChatId || !tenant)
        return;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const articles = await prisma_1.prisma.article.findMany({
        where: { tenantId, createdAt: { gte: weekAgo } }
    });
    const published = articles.filter(a => a.status === 'PUBLISHED');
    const failed = articles.filter(a => a.status === 'FAILED');
    // Ranking dari DataForSEO / crawler
    let rankingInfo = '';
    try {
        const { checkGoogleRankings } = await Promise.resolve().then(() => __importStar(require('../crawler/google')));
        const rankings = await checkGoogleRankings(tenantId);
        if (rankings.length > 0) {
            rankingInfo = rankings.map(r => `• Keyword "${r.keyword}": Posisi #${r.position ?? '>100'} (Halaman 1: ${r.inFirstPage ? 'Ya ✅' : 'Belum ⏳'})`).join('\n');
        }
        else {
            rankingInfo = '_Belum ada target keyword yang disetting_';
        }
    }
    catch {
        rankingInfo = '_Data ranking belum tersedia_';
    }
    // AI search visibility
    let aiInfo = '';
    try {
        const { checkAiVisibility } = await Promise.resolve().then(() => __importStar(require('../crawler/chatgpt')));
        const aiVis = await checkAiVisibility(tenantId);
        if (aiVis.length > 0) {
            aiInfo = aiVis.map((v) => `• Keyword "${v.keyword}": Muncul di ChatGPT (${v.appearsInChatGpt ? 'Ya ✅' : 'Belum ❌'}) | Perplexity (${v.appearsInPerplexity ? 'Ya ✅' : 'Belum ❌'})`).join('\n');
        }
        else {
            aiInfo = '• ChatGPT: _Aktifkan keyword di pengaturan_';
        }
    }
    catch {
        aiInfo = '• ChatGPT: _Evaluasi tersedia di dashboard_';
    }
    let msg = `📊 *LAPORAN MINGGUAN*\n`;
    msg += `${formatDate(weekAgo)} s/d ${formatDate(new Date())}\n`;
    msg += `Website: *${tenant.name}* (${tenant.domain})\n\n`;
    msg += `📝 *KONTEN MINGGU INI*\n`;
    msg += `• Total artikel: ${articles.length}\n`;
    msg += `• Berhasil publish: ${published.length}\n`;
    msg += `• Gagal: ${failed.length}\n\n`;
    msg += `🔍 *STATUS GOOGLE RANKING*\n`;
    msg += `${rankingInfo}\n\n`;
    msg += `🤖 *STATUS AI SEARCH (ChatGPT/Perplexity)*\n`;
    msg += `${aiInfo}\n\n`;
    if (setting.competitors?.length > 0) {
        msg += `🏆 *KOMPETITOR*\n`;
        for (const c of setting.competitors.slice(0, 3)) {
            msg += `• ${c}\n`;
        }
        msg += '\n';
    }
    msg += `📈 Laporan ranking detail tersedia di dashboard.`;
    const bot = getBot(setting.telegramBotToken);
    await bot.telegram.sendMessage(setting.telegramChatId, msg, { parse_mode: 'Markdown' });
    await prisma_1.prisma.report.create({
        data: {
            tenantId, type: 'WEEKLY',
            data: { published: published.length, failed: failed.length, period: { from: weekAgo, to: new Date() } }
        }
    });
}
//# sourceMappingURL=telegram.js.map