import { Telegraf } from 'telegraf'
import { prisma } from '../lib/prisma'

function getBot(token?: string | null) {
  const finalToken = token || process.env.TELEGRAM_BOT_TOKEN
  if (!finalToken) throw new Error('Token bot telegram tidak tersedia')
  return new Telegraf(finalToken)
}

function formatDate(d: Date) {
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

export async function sendDailyReport(tenantId: string) {
  const setting = await prisma.tenantSetting.findUnique({ where: { tenantId } })
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!setting?.telegramChatId || !tenant) return

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const articles = await prisma.article.findMany({
    where: { tenantId, createdAt: { gte: today } },
    orderBy: { createdAt: 'desc' }
  })

  const published = articles.filter(a => a.status === 'PUBLISHED')
  const failed = articles.filter(a => a.status === 'FAILED')

  const nextSchedule = await prisma.schedule.findFirst({
    where: { tenantId, isActive: true },
    orderBy: { nextRun: 'asc' }
  })

  let msg = `✅ *LAPORAN HARIAN — ${formatDate(new Date())}*\n`
  msg += `Website: *${tenant.name}* (${tenant.domain})\n\n`
  msg += `📝 *Artikel dipublikasi: ${published.length}*\n`

  for (const a of published) {
    msg += `  • ${a.title}\n`
    if (a.cmsPostUrl) msg += `    🔗 ${a.cmsPostUrl}\n`
  }

  if (failed.length > 0) {
    msg += `\n⚠️ *Gagal: ${failed.length} artikel*\n`
    for (const a of failed) {
      msg += `  ❌ ${a.title}\n`
      if (a.errorLog) msg += `    Error: ${a.errorLog.slice(0, 100)}\n`
    }
  }

  if (nextSchedule?.nextRun) {
    msg += `\n🕐 Jadwal berikutnya: ${nextSchedule.nextRun.toLocaleString('id-ID')}`
  }

  const bot = getBot(setting.telegramBotToken)
  await bot.telegram.sendMessage(setting.telegramChatId, msg, { parse_mode: 'Markdown' })

  // Simpan ke DB
  await prisma.report.create({
    data: { tenantId, type: 'DAILY', data: { published: published.length, failed: failed.length, articles: published.map(a => ({ title: a.title, url: a.cmsPostUrl })) } }
  })
}

export async function sendWeeklyReport(tenantId: string) {
  const setting = await prisma.tenantSetting.findUnique({ where: { tenantId } })
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!setting?.telegramChatId || !tenant) return

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const articles = await prisma.article.findMany({
    where: { tenantId, createdAt: { gte: weekAgo } }
  })

  const published = articles.filter(a => a.status === 'PUBLISHED')
  const failed = articles.filter(a => a.status === 'FAILED')

  // Ranking dari DataForSEO / crawler
  let rankingInfo = ''
  try {
    const { checkGoogleRankings } = await import('../crawler/google')
    const rankings = await checkGoogleRankings(tenantId)
    if (rankings.length > 0) {
      rankingInfo = rankings.map(r => 
        `• Keyword "${r.keyword}": Posisi #${r.position ?? '>100'} (Halaman 1: ${r.inFirstPage ? 'Ya ✅' : 'Belum ⏳'})`
      ).join('\n')
    } else {
      rankingInfo = '_Belum ada target keyword yang disetting_'
    }
  } catch {
    rankingInfo = '_Data ranking belum tersedia_'
  }

  // AI search visibility
  let aiInfo = ''
  try {
    const { checkAiVisibility } = await import('../crawler/chatgpt')
    const aiVis = await checkAiVisibility(tenantId)
    if (aiVis.length > 0) {
      aiInfo = aiVis.map((v: any) =>
        `• Keyword "${v.keyword}": Muncul di ChatGPT (${v.appearsInChatGpt ? 'Ya ✅' : 'Belum ❌'}) | Perplexity (${v.appearsInPerplexity ? 'Ya ✅' : 'Belum ❌'})`
      ).join('\n')
    } else {
      aiInfo = '• ChatGPT: _Aktifkan keyword di pengaturan_'
    }
  } catch {
    aiInfo = '• ChatGPT: _Evaluasi tersedia di dashboard_'
  }

  let msg = `📊 *LAPORAN MINGGUAN*\n`
  msg += `${formatDate(weekAgo)} s/d ${formatDate(new Date())}\n`
  msg += `Website: *${tenant.name}* (${tenant.domain})\n\n`

  msg += `📝 *KONTEN MINGGU INI*\n`
  msg += `• Total artikel: ${articles.length}\n`
  msg += `• Berhasil publish: ${published.length}\n`
  msg += `• Gagal: ${failed.length}\n\n`

  msg += `🔍 *STATUS GOOGLE RANKING*\n`
  msg += `${rankingInfo}\n\n`

  msg += `🤖 *STATUS AI SEARCH (ChatGPT/Perplexity)*\n`
  msg += `${aiInfo}\n\n`

  if (setting.competitors?.length > 0) {
    msg += `🏆 *KOMPETITOR*\n`
    for (const c of setting.competitors.slice(0, 3)) {
      msg += `• ${c}\n`
    }
    msg += '\n'
  }

  msg += `📈 Laporan ranking detail tersedia di dashboard.`

  const bot = getBot(setting.telegramBotToken)
  await bot.telegram.sendMessage(setting.telegramChatId, msg, { parse_mode: 'Markdown' })

  await prisma.report.create({
    data: {
      tenantId, type: 'WEEKLY',
      data: { published: published.length, failed: failed.length, period: { from: weekAgo, to: new Date() } }
    }
  })
}
